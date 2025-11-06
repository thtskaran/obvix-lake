"""GLPI integration primitives: API client, resolution extraction, and sync orchestration."""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

import requests
from dateutil import parser as date_parser

logger = logging.getLogger(__name__)

ISO_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


class GLPIClient:
    """Lightweight wrapper around GLPI's REST API."""

    def __init__(
        self,
        host: str,
        app_token: str,
        api_token: str,
        verify_ssl: bool = True,
        request_timeout: int = 20,
    ) -> None:
        self.host = host.rstrip("/")
        self.app_token = app_token
        self.api_token = api_token
        self.verify_ssl = verify_ssl
        self.request_timeout = request_timeout
        self.session_token: Optional[str] = None
        self.session = requests.Session()

    # ------------------------------------------------------------------
    def _url(self, path: str) -> str:
        path = path.strip("/")
        return f"{self.host}/apirest.php/{path}" if path else f"{self.host}/apirest.php"

    def _base_headers(self) -> Dict[str, str]:
        return {
            "App-Token": self.app_token,
            "Authorization": f"user_token {self.api_token}",
            "Content-Type": "application/json",
        }

    def _session_headers(self) -> Dict[str, str]:
        headers = self._base_headers()
        if self.session_token:
            headers["Session-Token"] = self.session_token
        return headers

    def init_session(self, force: bool = False) -> str:
        if self.session_token and not force:
            return self.session_token
        resp = self.session.get(
            self._url("initSession"),
            headers=self._base_headers(),
            timeout=self.request_timeout,
            verify=self.verify_ssl,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("session_token")
        if not token:
            raise RuntimeError("GLPI session_token missing in initSession response")
        self.session_token = token
        return token

    def kill_session(self) -> None:
        if not self.session_token:
            return
        try:
            self.session.get(
                self._url("killSession"),
                headers=self._session_headers(),
                timeout=self.request_timeout,
                verify=self.verify_ssl,
            )
        finally:
            self.session_token = None

    def health_check(self) -> Dict[str, Any]:
        try:
            self.init_session(force=True)
            self.kill_session()
            return {"status": "ok"}
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("GLPI health check failed: %s", exc)
            return {"status": "error", "error": str(exc)}

    # ------------------------------------------------------------------
    def get_ticket(self, ticket_id: int) -> Optional[Dict[str, Any]]:
        try:
            self.init_session()
            resp = self.session.get(
                self._url(f"Ticket/{ticket_id}"),
                headers=self._session_headers(),
                timeout=self.request_timeout,
                verify=self.verify_ssl,
            )
            if resp.status_code == 404:
                return None
            resp.raise_for_status()
            return resp.json()
        except Exception as exc:
            logger.error("Failed to fetch GLPI ticket %s: %s", ticket_id, exc)
            return None

    def search_closed_tickets(self, since: datetime, limit: int = 100) -> List[Dict[str, Any]]:
        """Search recently closed tickets and return lightweight rows."""
        payload = {
            "criteria": [
                {"field": "15", "searchtype": "greaterthan", "value": since.strftime(ISO_FORMAT)},  # closedate
                {"link": "AND", "field": "12", "searchtype": "contains", "value": "solved"},  # status contains solved/closed text
            ],
            "forcedisplay": ["2", "1", "12", "15", "5"],
            "order": "ASC",
            "sort": 15,
            "range": f"0-{limit}",
        }
        try:
            self.init_session()
            resp = self.session.post(
                self._url("search/Ticket"),
                headers=self._session_headers(),
                json=payload,
                timeout=self.request_timeout,
                verify=self.verify_ssl,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", [])
        except Exception as exc:
            logger.error("GLPI ticket search failed: %s", exc)
            return []

    def fetch_closed_tickets_since(self, since: datetime, limit: int = 50) -> List[Dict[str, Any]]:
        rows = self.search_closed_tickets(since, limit=limit)
        tickets: List[Dict[str, Any]] = []
        for row in rows:
            ticket_id = row.get("2") or row.get("id") or row.get("Ticket.id")
            if not ticket_id:
                continue
            ticket = self.get_ticket(int(ticket_id))
            if not ticket:
                continue
            closed_value = ticket.get("closedate") or ticket.get("solvedate") or ticket.get("date")
            closed_at = None
            if closed_value:
                try:
                    closed_at = date_parser.parse(closed_value)
                except (ValueError, TypeError):
                    closed_at = None
            if closed_at and closed_at < since:
                continue
            ticket["closed_at"] = closed_at
            tickets.append(ticket)
        return tickets


    def create_ticket(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        body = payload if "input" in payload else {"input": payload}
        try:
            self.init_session()
            resp = self.session.post(
                self._url("Ticket"),
                headers=self._session_headers(),
                json=body,
                timeout=self.request_timeout,
                verify=self.verify_ssl,
            )
            resp.raise_for_status()
            data = resp.json()
            if not data:
                raise RuntimeError("GLPI returned empty response when creating ticket")
            return data
        except Exception as exc:
            logger.error("Failed to create GLPI ticket: %s", exc)
            raise


class ResolutionExtractor:
    """Turns free-form GLPI resolution notes into structured knowledge objects."""

    def __init__(
        self,
        llm_json_fn: Callable[[str, str, Dict[str, Any]], Dict[str, Any]],
        embedding_fn: Callable[[List[str]], List[List[float]]],
    ) -> None:
        self._llm_json_fn = llm_json_fn
        self._embedding_fn = embedding_fn

    def extract(self, ticket: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        content = ticket.get("content") or ticket.get("content_text") or ""
        solution = ticket.get("solution") or ticket.get("solutioncontent") or ""
        notes_blocks: List[str] = []
        for followup in ticket.get("followups", []) or []:
            if isinstance(followup, dict):
                txt = followup.get("content") or followup.get("description")
                if txt:
                    notes_blocks.append(txt)
        joined_notes = "\n".join(notes_blocks)
        if not (content or solution or joined_notes):
            return None

        prompt = f"""Ticket ID: {ticket.get('id')}\nTitle: {ticket.get('name')}\nRequester: {ticket.get('users_id_recipient')}\n\nProblem Statement:\n{content}\n\nResolution Notes:\n{solution}\n\nAdditional Notes:\n{joined_notes}\n"""
        fallback = {
            "problem_summary": ticket.get("name") or "Unknown issue",
            "solution_steps": [solution or joined_notes or ""],
            "entities": [],
            "resolution_type": "unspecified",
            "confidence": 0.5,
        }
        system = (
            "You are a support analyst. Extract a structured summary of the problem and resolution. "
            "Return JSON with keys: problem_summary, root_cause, solution_steps (array of strings), "
            "entities (array of strings), resolution_type (one of troubleshooting, configuration, bugfix, usage, escalation), "
            "confidence (0-1 float)."
        )
        parsed = self._llm_json_fn(system, prompt, fallback)
        summary_text = (
            f"Problem: {parsed.get('problem_summary', '')}\n"
            f"Root cause: {parsed.get('root_cause', '')}\n"
            f"Solution: {'; '.join(parsed.get('solution_steps', []) or [])}"
        ).strip()
        embedding = self._embedding_fn([summary_text])[0]
        closed_val = ticket.get("closed_at") or ticket.get("closedate")
        closed_dt = closed_val
        if isinstance(closed_val, str):
            try:
                closed_dt = date_parser.parse(closed_val)
            except (ValueError, TypeError):
                closed_dt = None
        return {
            "ticket_id": ticket.get("id"),
            "title": ticket.get("name"),
            "problem_summary": parsed.get("problem_summary"),
            "root_cause": parsed.get("root_cause"),
            "solution_steps": parsed.get("solution_steps", []),
            "entities": parsed.get("entities", []),
            "resolution_type": parsed.get("resolution_type", "unspecified"),
            "confidence": float(parsed.get("confidence", 0.5)),
            "closed_at": closed_dt,
            "updated_at": datetime.now(timezone.utc),
            "summary_embedding": embedding,
            "raw_ticket": {
                "id": ticket.get("id"),
                "status": ticket.get("status"),
                "closedate": ticket.get("closedate"),
                "content": content,
                "solution": solution,
            },
        }


class GLPISyncService:
    """Periodically syncs GLPI tickets and routes structured resolutions downstream."""

    def __init__(
        self,
        db,
        glpi_client: GLPIClient,
        extractor: ResolutionExtractor,
        resolution_handler: Optional[Callable[[Dict[str, Any]], None]] = None,
        state_collection: str = "glpi_sync_state",
        raw_collection: str = "glpi_tickets",
        resolution_collection: str = "glpi_resolutions",
    ) -> None:
        self.db = db
        self.client = glpi_client
        self.extractor = extractor
        self.resolution_handler = resolution_handler
        self.state_collection = state_collection
        self.raw_collection = raw_collection
        self.resolution_collection = resolution_collection

    # ------------------------------------------------------------------
    def _state_doc(self) -> Dict[str, Any]:
        doc = self.db[self.state_collection].find_one({})
        if not doc:
            doc = {"_id": "glpi_state", "last_synced_at": datetime.now(timezone.utc) - timedelta(days=1)}
            self.db[self.state_collection].insert_one(doc)
        return doc

    def sync_once(self) -> Dict[str, Any]:
        state = self._state_doc()
        last_synced: datetime = state.get("last_synced_at", datetime.now(timezone.utc) - timedelta(hours=6))
        logger.info("Starting GLPI sync since %s", last_synced)
        tickets = self.client.fetch_closed_tickets_since(last_synced, limit=100)
        processed = 0
        created = 0
        for ticket in tickets:
            ticket_id = ticket.get("id")
            if not ticket_id:
                continue
            ticket_doc = {**ticket}
            ticket_doc["synced_at"] = datetime.now(timezone.utc)
            self.db[self.raw_collection].update_one({"ticket_id": ticket_id}, {"$set": ticket_doc}, upsert=True)
            resolution = self.extractor.extract(ticket)
            if not resolution:
                continue
            resolution["ticket_id"] = ticket_id
            self.db[self.resolution_collection].update_one(
                {"ticket_id": ticket_id},
                {"$set": resolution},
                upsert=True,
            )
            created += 1
            processed += 1
            if self.resolution_handler:
                try:
                    self.resolution_handler(resolution)
                except Exception as exc:  # pragma: no cover - defensive
                    logger.error("Resolution handler failed for ticket %s: %s", ticket_id, exc)

        if tickets:
            last_closed = max(
                (ticket.get("closed_at") for ticket in tickets if ticket.get("closed_at")),
                key=lambda dt: dt,
                default=last_synced,
            )
            if last_closed and isinstance(last_closed, datetime):
                new_state = {"last_synced_at": last_closed}
            else:
                new_state = {"last_synced_at": datetime.now(timezone.utc)}
            self.db[self.state_collection].update_one({"_id": state["_id"]}, {"$set": new_state})

        logger.info("GLPI sync processed %s tickets, %s resolutions", len(tickets), created)
        return {"fetched": len(tickets), "resolutions": created}

    def run_forever(self, interval_seconds: int = 3600) -> None:
        while True:
            try:
                self.sync_once()
            except Exception as exc:  # pragma: no cover - defensive
                logger.error("GLPI sync loop error: %s", exc)
            time.sleep(interval_seconds)
