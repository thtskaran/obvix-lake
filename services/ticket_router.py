"""Ticket routing, classification, and semantic similarity helpers."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np

from services.rag_utils import extract_query_terms, stream_article_chunks, stream_manual_chunks

logger = logging.getLogger(__name__)


def _cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    a = np.array(vec_a)
    b = np.array(vec_b)
    denom = (np.linalg.norm(a) * np.linalg.norm(b)) or 1.0
    return float(np.dot(a, b) / denom)


class TicketRouter:
    def __init__(
        self,
        db,
        llm_json_fn,
        embedding_fn,
        persona_prefix: str,
        audit_collection: str = "ticket_routing_audit",
        max_docs_to_score: int = 400,
    ) -> None:
        self.db = db
        self._llm_json_fn = llm_json_fn
        self._embedding_fn = embedding_fn
        self.persona_prefix = persona_prefix
        self.max_docs_to_score = max_docs_to_score
        self.audit_collection = audit_collection

    # ------------------------------------------------------------------
    def classify(self, ticket_text: str, metadata: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        metadata = metadata or {}
        system = (
            "You are a triage controller. Label the ticket with multiple dimensions. "
            "Return STRICT JSON with keys: issue_category, issue_type, urgency (low|medium|high|urgent), "
            "impact_scope (single_user|multi_user|systemwide), sentiment (angry|neutral|positive), "
            "requires_human (bool), needs_supervisor (bool), confidence (0-1 float)."
        )
        user_payload = f"Ticket text:\n{ticket_text}\n\nKnown metadata: {metadata}"
        fallback = {
            "issue_category": "general",
            "issue_type": "diagnostic",
            "urgency": "medium",
            "impact_scope": "single_user",
            "sentiment": "neutral",
            "requires_human": True,
            "needs_supervisor": False,
            "confidence": 0.45,
        }
        return self._llm_json_fn(system, user_payload, fallback)

    def _persona_collection(self, persona: str):
        return self.db[f"{self.persona_prefix}{persona}"]

    def _vector_candidates(self, persona: str) -> List[Dict[str, Any]]:
        collection = self._persona_collection(persona)
        results: List[Dict[str, Any]] = []
        manual_cursor = (
            collection.find({"doc_type": "knowledge", "embedding": {"$exists": True}})
            .limit(self.max_docs_to_score)
        )
        for chunk in stream_manual_chunks(manual_cursor, require_embedding=True):
            chunk["match_reason"] = "vector"
            results.append(chunk)
            if len(results) >= self.max_docs_to_score:
                return results
        article_cursor = (
            collection.find({"doc_type": "knowledge_article", "chunks.embedding": {"$exists": True}})
            .limit(self.max_docs_to_score)
        )
        for chunk in stream_article_chunks(article_cursor, require_embedding=True):
            chunk["match_reason"] = "vector"
            results.append(chunk)
            if len(results) >= self.max_docs_to_score:
                break
        return results

    def _score_chunks(
        self,
        chunks: List[Dict[str, Any]],
        query_embedding: List[float],
        top_k: int,
    ) -> List[Dict[str, Any]]:
        scored: List[Dict[str, Any]] = []
        for chunk in chunks:
            embedding = chunk.get("embedding")
            if not embedding:
                continue
            scored.append(
                {
                    "content": chunk.get("content"),
                    "similarity": _cosine_similarity(query_embedding, embedding),
                    "match_reason": chunk.get("match_reason"),
                    "article_id": chunk.get("article_id") or chunk.get("doc_id"),
                    "source_ticket_id": chunk.get("source_ticket_id"),
                    "title": chunk.get("title"),
                }
            )
        scored.sort(key=lambda item: item["similarity"], reverse=True)
        return scored[:top_k]

    def _top_knowledge_matches(
        self,
        persona: str,
        query_embedding: List[float],
        query_terms: List[str],
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        vector_chunks = self._vector_candidates(persona)
        if not vector_chunks:
            return []
        tagged_chunks = []
        if query_terms:
            tagged_chunks = [
                chunk for chunk in vector_chunks if set(query_terms) & set((chunk.get("tags") or []))
            ]
        combined: Dict[str, Dict[str, Any]] = {}
        for chunk in vector_chunks:
            doc_id = str(chunk.get("doc_id") or chunk.get("article_id"))
            combined[doc_id] = chunk
        for chunk in tagged_chunks:
            doc_id = str(chunk.get("doc_id") or chunk.get("article_id"))
            combined[doc_id] = chunk
        return self._score_chunks(list(combined.values()), query_embedding, top_k)

    # ------------------------------------------------------------------
    def route_ticket(
        self,
        persona: str,
        ticket_text: str,
        ticket_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        persona_slug = persona.lower().replace(" ", "_")
        classification = self.classify(ticket_text, metadata) or {}
        embedding = self._embedding_fn([ticket_text])[0]
        query_terms = extract_query_terms(ticket_text)
        matches = self._top_knowledge_matches(persona_slug, embedding, query_terms)
        top_score = matches[0]["similarity"] if matches else 0.0
        has_matches = bool(matches)
        if has_matches and classification.get("requires_human"):
            classification["requires_human"] = False

        if not has_matches and classification.get("requires_human", True):
            decision = "human_agent"
        elif classification.get("needs_supervisor"):
            decision = "human_agent"
        else:
            decision = "assistive"
        audit_doc = {
            "ticket_id": ticket_id,
            "persona": persona_slug,
            "decision": decision,
            "classification": classification,
            "top_similarity": top_score,
            "assistive_mode": decision == "assistive",
            "timestamp": datetime.now(timezone.utc),
        }
        self.db[self.audit_collection].insert_one(audit_doc)
        response: Dict[str, Any] = {
            "ticket_id": ticket_id,
            "persona": persona_slug,
            "decision": decision,
            "classification": classification,
            "matches": matches,
            "assistive": decision == "assistive",
            "top_similarity": top_score,
        }
        response["route_to_human"] = decision == "human_agent"
        return response

    # ------------------------------------------------------------------
    def stats(self) -> Dict[str, Any]:
        assistive_count = self.db[self.audit_collection].count_documents({"decision": "assistive"})
        human_count = self.db[self.audit_collection].count_documents({"decision": "human_agent"})
        total = assistive_count + human_count
        rate = (assistive_count / total) if total else 0.0
        return {
            "assistive": assistive_count,
            "human_agent": human_count,
            "assistive_rate": rate,
            "total_routed": total,
        }
