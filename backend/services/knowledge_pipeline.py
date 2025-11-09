"""Knowledge base expansion pipeline built atop GLPI resolutions."""
from __future__ import annotations

import json
import logging
import re
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
from bson import ObjectId

logger = logging.getLogger(__name__)

_STOPWORDS = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "from",
    "this",
    "have",
    "when",
    "user",
    "agent",
    "customer",
    "issue",
    "problem",
    "case",
    "ticket",
    "need",
    "needs",
    "error",
    "please",
    "unable",
    "cant",
    "cannot",
    "req",
}

def _cosine(a: List[float], b: List[float]) -> float:
    va = np.array(a)
    vb = np.array(b)
    denom = (np.linalg.norm(va) * np.linalg.norm(vb)) or 1.0
    return float(np.dot(va, vb) / denom)


class KnowledgePipeline:
    def __init__(
        self,
        db,
        persona_prefix: str,
        default_persona: str,
        llm_json_fn,
        embedding_fn,
        queue_collection: str = "knowledge_pipeline_queue",
        auto_approve: bool = True,
    ) -> None:
        self.db = db
        self.persona_prefix = persona_prefix
        self.default_persona = default_persona
        self._llm_json_fn = llm_json_fn
        self._embedding_fn = embedding_fn
        self.queue_collection = queue_collection
        self.auto_approve = auto_approve
        self._cleanup_legacy_chunks()

    def _cleanup_legacy_chunks(self) -> None:
        try:
            for name in self.db.list_collection_names():
                if not name.startswith(self.persona_prefix):
                    continue
                result = self.db[name].delete_many({"doc_type": "knowledge", "source": "glpi_pipeline"})
                if result.deleted_count:
                    logger.info("Removed %s legacy GLPI chunk docs from %s", result.deleted_count, name)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Legacy GLPI chunk cleanup failed: %s", exc)

    # ------------------------------------------------------------------
    def _persona_collection(self, persona: str):
        return self.db[f"{self.persona_prefix}{persona}"]

    def _tokenize_keywords(self, text: Optional[str], limit: int = 5) -> List[str]:
        if not text:
            return []
        tokens = re.findall(r"[a-z0-9]+", text.lower())
        keywords: List[str] = []
        for token in tokens:
            if token in _STOPWORDS or len(token) < 3:
                continue
            if token in keywords:
                continue
            keywords.append(token)
            if len(keywords) >= limit:
                break
        return keywords

    def _derive_issue_tags(self, resolution: Dict[str, Any]) -> List[str]:
        tags = self._tokenize_keywords(resolution.get("problem_summary"), limit=3)
        if len(tags) < 3:
            tags.extend(self._tokenize_keywords(resolution.get("root_cause"), limit=3))
        if len(tags) < 3 and resolution.get("resolution_type"):
            tags.append(str(resolution.get("resolution_type")).lower())
        return tags[:3]

    def _normalize_tags(self, tags: Any, resolution: Dict[str, Any]) -> List[str]:
        raw: List[str] = []
        if isinstance(tags, str):
            raw = [part.strip() for part in re.split(r"[,;\n]", tags) if part.strip()]
        elif isinstance(tags, list):
            raw = [str(item).strip() for item in tags if str(item).strip()]
        cleaned: List[str] = []
        for value in raw:
            tag = value.lower().strip().lstrip("#")
            tag = re.sub(r"[^a-z0-9\-_/ ]+", "", tag)
            tag = tag.replace("/", " ").strip()
            if not tag:
                continue
            if re.search(r"\bid\b", tag) or re.search(r"\d{4,}", tag):
                continue
            if tag in {"user", "agent", "customer", "client"}:
                continue
            tag = tag.replace(" ", "_")
            if tag in cleaned:
                continue
            cleaned.append(tag)
            if len(cleaned) >= 3:
                break
        if not cleaned:
            cleaned = self._derive_issue_tags(resolution)
        return cleaned[:3]

    def _compose_transcript(self, resolution: Dict[str, Any], max_chars: int = 6000) -> str:
        raw_ticket = resolution.get("raw_ticket") or {}
        sections: List[str] = []
        content = (raw_ticket.get("content") or "").strip()
        if content:
            sections.append(f"Original Request:\n{content}")
        solution = (raw_ticket.get("solution") or "").strip()
        if solution:
            sections.append(f"Technician Notes:\n{solution}")
        followups = raw_ticket.get("followups") or []
        for idx, followup in enumerate(followups):
            if not isinstance(followup, dict):
                continue
            details = (followup.get("content") or followup.get("description") or "").strip()
            if not details:
                continue
            author = followup.get("author") or followup.get("users_id")
            prefix = f"Follow-up #{idx + 1}"
            if author:
                prefix += f" ({author})"
            sections.append(f"{prefix}:\n{details}")
        transcript = "\n\n".join(sections).strip()
        if len(transcript) > max_chars:
            transcript = transcript[:max_chars].rstrip() + "\n..."
        return transcript

    def _compose_full_text(self, article: Dict[str, Any]) -> str:
        sections: List[str] = []
        summary = (article.get("summary") or "").strip()
        if summary:
            sections.append(f"## Summary\n{summary}")
        actions = article.get("technician_actions") or []
        if actions:
            action_lines = ["## Technician Actions"]
            for step in actions:
                step_text = str(step).strip()
                if step_text:
                    action_lines.append(f"- {step_text}")
            if len(action_lines) > 1:
                sections.append("\n".join(action_lines))
        outline = article.get("resolution_outline") or article.get("steps") or []
        for entry in outline:
            if isinstance(entry, dict):
                heading = entry.get("title") or entry.get("section") or entry.get("label") or "Step"
                details = entry.get("details") or entry.get("text") or entry.get("content") or ""
            else:
                heading = "Step"
                details = str(entry)
            details = details.strip()
            if not details:
                continue
            sections.append(f"## {heading.strip()}\n{details}")
        faq_entries = article.get("faq") or []
        if faq_entries:
            faq_lines = ["## FAQ"]
            for item in faq_entries:
                if isinstance(item, dict):
                    question = item.get("question") or item.get("q")
                    answer = item.get("answer") or item.get("a")
                else:
                    question = None
                    answer = None
                if not question and isinstance(item, str):
                    question = item
                if not answer and isinstance(item, str):
                    answer = item
                if not question and not answer:
                    continue
                faq_lines.append(f"Q: {question.strip() if question else 'Details'}")
                if answer:
                    faq_lines.append(f"A: {answer.strip()}")
            if len(faq_lines) > 1:
                sections.append("\n".join(faq_lines))
        recommendations = article.get("preventive_actions") or article.get("recommendations") or []
        if recommendations:
            rec_lines = ["## Prevention"]
            for rec in recommendations:
                rec_lines.append(f"- {str(rec).strip()}")
            sections.append("\n".join(rec_lines))
        compiled = "\n\n".join(section for section in sections if section.strip())
        return compiled.strip()

    def _extract_validated_facts(self, transcript: str) -> List[Dict[str, Any]]:
        if not transcript:
            return []
        system = (
            "You are a knowledge base extraction assistant. Extract ONLY facts that are explicitly stated "
            "inside the provided ticket transcript. Return STRICT JSON as an array of objects with keys "
            "fact, source, confidence (HIGH|MEDIUM|LOW)."
        )
        payload = json.dumps({"ticket_conversation": transcript}, ensure_ascii=False)
        fallback: List[Dict[str, Any]] = []
        result = self._llm_json_fn(system, payload, fallback)
        rows: List[Dict[str, Any]] = []
        if isinstance(result, list):
            rows = result
        elif isinstance(result, dict) and isinstance(result.get("facts"), list):
            rows = result.get("facts") or []
        validated: List[Dict[str, Any]] = []
        for entry in rows:
            fact_text = (entry.get("fact") or entry.get("Fact") or "").strip()
            source_text = (entry.get("source") or entry.get("Source") or "").strip()
            confidence = (entry.get("confidence") or entry.get("Confidence") or "LOW").upper()
            if not fact_text or not source_text:
                continue
            if source_text not in transcript:
                continue
            if not (30 <= len(fact_text) <= 500):
                continue
            validated.append({
                "fact": fact_text,
                "source": source_text,
                "confidence": confidence,
            })
        return validated

    # ------------------------------------------------------------------
    def enqueue_resolution(self, resolution_doc: Dict[str, Any], persona: Optional[str] = None) -> None:
        persona_slug = (persona or resolution_doc.get("target_persona") or "").strip().lower().replace(" ", "_")
        if not persona_slug:
            logger.warning("Skipping resolution %s – no persona specified", resolution_doc.get("ticket_id"))
            return
        payload = {
            "resolution_id": resolution_doc.get("ticket_id"),
            "persona": persona_slug,
            "resolution": resolution_doc,
            "status": "pending",
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc),
        }
        self.db[self.queue_collection].update_one(
            {"resolution_id": payload["resolution_id"]},
            {"$set": payload},
            upsert=True,
        )

    # ------------------------------------------------------------------
    def process_next(self) -> bool:
        doc = self.db[self.queue_collection].find_one_and_update(
            {"status": {"$in": ["pending", "requeued"]}},
            {"$set": {"status": "drafting", "updated_at": datetime.now(timezone.utc)}},
            sort=[("updated_at", 1)],
        )
        if not doc:
            return False
        resolution = doc.get("resolution", {})
        persona = (
            doc.get("persona")
            or resolution.get("target_persona")
            or self.default_persona
            or ""
        ).strip().lower().replace(" ", "_")
        if not persona:
            self.db[self.queue_collection].update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": "error", "error": "persona_missing", "updated_at": datetime.now(timezone.utc)}},
            )
            return False
        logger.info(
            "[KnowledgePipeline] Drafting article for ticket %s (queue_id=%s) targeting persona %s",
            resolution.get("ticket_id"),
            doc.get("_id"),
            persona,
        )
        draft = self._draft_article(resolution)
        if not draft:
            self.db[self.queue_collection].update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": "error", "error": "draft_failed", "updated_at": datetime.now(timezone.utc)}},
            )
            return False
        base_update: Dict[str, Any] = {
            "draft": draft,
            "status": "lead_review" if self.auto_approve else "awaiting_approval",
            "updated_at": datetime.now(timezone.utc),
        }
        self.db[self.queue_collection].update_one({"_id": doc["_id"]}, {"$set": base_update})

        if not self.auto_approve:
            return True

        # Automated approvals for prototype: mark as reviewed immediately
        now = datetime.now(timezone.utc)
        self.db[self.queue_collection].update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "status": "sme_review",
                    "lead_reviewed_at": now,
                    "sme_reviewed_at": now,
                    "updated_at": now,
                    "approval_mode": "auto",
                }
            },
        )
        publish_result = self._publish_article(persona, draft, resolution, approval_mode="auto")
        status = "published" if publish_result else "error"
        logger.info(
            "[KnowledgePipeline] Auto-publish %s for ticket %s under persona %s",
            "succeeded" if publish_result else "failed",
            resolution.get("ticket_id"),
            persona,
        )
        self.db[self.queue_collection].update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": status, "published_article_id": publish_result, "updated_at": datetime.now(timezone.utc)}},
        )
        return bool(publish_result)

    # ------------------------------------------------------------------
    def approve_queue_item(self, queue_id, reviewer: str = "manual") -> Dict[str, Any]:
        doc = self.db[self.queue_collection].find_one({"_id": queue_id})
        if not doc:
            raise ValueError("Queue item not found")
        if doc.get("status") not in {"awaiting_approval", "requeued"}:
            raise ValueError("Queue item is not awaiting approval")
        persona = doc.get("persona") or self.default_persona
        resolution = doc.get("resolution", {})
        draft = doc.get("draft") or self._draft_article(resolution)
        if not draft:
            raise ValueError("Draft missing for queue item")
        publish_result = self._publish_article(persona, draft, resolution, approval_mode="manual")
        logger.info(
            "[KnowledgePipeline] Manual publish %s for ticket %s under persona %s",
            "succeeded" if publish_result else "failed",
            resolution.get("ticket_id"),
            persona,
        )
        now = datetime.now(timezone.utc)
        status = "published" if publish_result else "error"
        self.db[self.queue_collection].update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "status": status,
                    "published_article_id": publish_result,
                    "lead_reviewed_at": now,
                    "sme_reviewed_at": now,
                    "updated_at": now,
                    "approval_mode": "manual",
                    "approved_by": reviewer,
                }
            },
        )
        return {"status": status, "article_id": publish_result}

    def reject_queue_item(
        self,
        queue_id,
        reviewer: str = "manual",
        reason: Optional[str] = None,
    ) -> Dict[str, Any]:
        doc = self.db[self.queue_collection].find_one({"_id": queue_id})
        if not doc:
            raise ValueError("Queue item not found")
        if doc.get("status") not in {"awaiting_approval", "requeued", "drafting", "pending"}:
            raise ValueError("Queue item cannot be rejected from its current status")
        now = datetime.now(timezone.utc)
        update_payload = {
            "status": "rejected",
            "updated_at": now,
            "rejected_at": now,
            "rejected_by": reviewer,
        }
        if reason:
            update_payload["rejection_reason"] = reason
        self.db[self.queue_collection].update_one({"_id": doc["_id"]}, {"$set": update_payload})
        return {
            "status": "rejected",
            "queue_id": str(doc["_id"]),
            "rejection_reason": reason,
        }

    # ------------------------------------------------------------------
    # ------------------------------------------------------------------
    def _draft_article(self, resolution: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not resolution:
            return None
        transcript = self._compose_transcript(resolution)
        validated_facts = self._extract_validated_facts(transcript)
        steps = resolution.get("solution_steps") or []
        steps_text = "\n".join([f"{idx + 1}. {step}" for idx, step in enumerate(steps)]) or "No technician steps captured."
        resolution_brief = (
            f"Ticket ID: {resolution.get('ticket_id')}\n"
            f"Problem summary: {resolution.get('problem_summary') or 'Unknown'}\n"
            f"Root cause: {resolution.get('root_cause') or 'Not documented'}\n"
            f"Technician actions:\n{steps_text}"
        )
        system = (
            "You are a telecom support knowledge author. "
            "Ingest the structured resolution brief plus the ticket transcript and craft an FAQ-style article. "
            "Ground every step in what the GLPI engineer actually did. "
            "Never suggest re-contacting a team unless the transcript explicitly says the case was left unresolved. "
            "Return STRICT JSON with keys: title, summary, audience (internal|customer), "
            "resolution_outline (array of {title, details}), faq (array of {question, answer}), "
            "preventive_actions (array of strings), tags (1-3 short issue-specific labels without IDs), full_text. "
            "Resolution_outline MUST paraphrase the provided technician actions; do not invent new steps."
        )
        outline_fallback = []
        for idx, step in enumerate(steps):
            outline_fallback.append({"title": f"Step {idx + 1}", "details": step})
        faq_fallback = [
            {
                "question": "What caused the issue?",
                "answer": resolution.get("root_cause") or "Cause not captured in ticket.",
            },
            {
                "question": "How was it resolved?",
                "answer": "; ".join(resolution.get("solution_steps") or []) or "Steps documented in transcript.",
            },
        ]
        body = {
            "ticket_id": resolution.get("ticket_id"),
            "problem_summary": resolution.get("problem_summary"),
            "root_cause": resolution.get("root_cause"),
            "solution_steps": steps,
            "resolution_type": resolution.get("resolution_type"),
            "entities": resolution.get("entities"),
            "transcript": transcript,
            "resolution_brief": resolution_brief,
        }
        fallback = {
            "title": resolution.get("title") or resolution.get("problem_summary") or "Untitled fix",
            "summary": resolution.get("problem_summary") or "",
            "audience": "internal",
            "resolution_outline": outline_fallback,
            "faq": faq_fallback,
            "preventive_actions": ["Monitor connection stability for 24h."],
            "tags": self._derive_issue_tags(resolution),
            "full_text": f"{resolution_brief}\n\nSolution recap:\n{steps_text}",
            "technician_actions": steps,
        }
        article = self._llm_json_fn(system, json.dumps(body, ensure_ascii=False), fallback)
        article["tags"] = self._normalize_tags(article.get("tags"), resolution)
        if not article.get("resolution_outline"):
            article["resolution_outline"] = outline_fallback
        if not article.get("faq"):
            article["faq"] = faq_fallback
        if not article.get("preventive_actions"):
            article["preventive_actions"] = fallback["preventive_actions"]
        if not article.get("technician_actions"):
            article["technician_actions"] = steps
        composed = self._compose_full_text(article)
        if composed:
            article["full_text"] = composed
        elif not article.get("full_text"):
            article["full_text"] = fallback["full_text"] or composed
        article["transcript_excerpt"] = transcript
        article["validated_facts"] = validated_facts
        return article

    def _check_duplicate(self, persona: str, embedding: List[float]) -> Optional[Dict[str, Any]]:
        persona_collection = self._persona_collection(persona)
        existing = list(
            persona_collection.find({"doc_type": "knowledge_article", "article_embedding": {"$exists": True}})
        )
        if not existing:
            return None
        similarities = [(_cosine(embedding, doc["article_embedding"]), doc) for doc in existing]
        similarities.sort(key=lambda pair: pair[0], reverse=True)
        top = similarities[0]
        if top[0] >= 0.85:
            return top[1]
        return None

    def _split_chunks(self, text: str, max_tokens: int = 500) -> List[str]:
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        chunks: List[str] = []
        current = []
        token_estimate = 0
        for para in paragraphs:
            tokens = len(para.split())
            if token_estimate + tokens > max_tokens and current:
                chunks.append("\n\n".join(current))
                current = [para]
                token_estimate = tokens
            else:
                current.append(para)
                token_estimate += tokens
        if current:
            chunks.append("\n\n".join(current))
        return chunks or [text]

    def _publish_article(
        self,
        persona: str,
        article: Dict[str, Any],
        resolution: Dict[str, Any],
        approval_mode: str,
    ) -> Optional[str]:
        text = (article.get("full_text") or "").strip()
        if not text:
            return None
        summary = article.get("summary") or resolution.get("problem_summary") or text[:280]
        persona_collection = self._persona_collection(persona)
        ticket_id = resolution.get("ticket_id")
        if ticket_id:
            persona_collection.delete_many(
                {"doc_type": "knowledge", "source": "glpi_pipeline", "ticket_id": ticket_id}
            )
        article_embedding = self._embedding_fn([summary])[0]
        chunks = self._split_chunks(text)
        logger.info(
            "[KnowledgePipeline] Publishing ticket %s into persona %s (chunks=%s)",
            ticket_id,
            persona,
            len(chunks),
        )
        duplicate = self._check_duplicate(persona, article_embedding)
        if duplicate:
            logger.info(
                "Duplicate knowledge detected (ticket %s matches article %s)",
                resolution.get("ticket_id"),
                duplicate.get("_id"),
            )
            return str(duplicate.get("_id"))
        embeddings = self._embedding_fn(chunks)
        approved_stamp = datetime.now(timezone.utc)
        article_doc_id = ObjectId()
        article_tags = article.get("tags") or []
        chunk_records: List[Dict[str, Any]] = []
        for idx, chunk in enumerate(chunks):
            chunk_records.append(
                {
                    "chunk_index": idx,
                    "content": chunk,
                    "content_preview": chunk[:280],
                    "embedding": embeddings[idx],
                }
            )
        transcript_excerpt = article.get("transcript_excerpt") or self._compose_transcript(resolution)
        article_doc = {
            "_id": article_doc_id,
            "doc_type": "knowledge_article",
            "persona": persona,
            "title": article.get("title") or summary,
            "summary": summary,
            "audience": article.get("audience"),
            "tags": article_tags,
            "faq": article.get("faq"),
            "resolution_outline": article.get("resolution_outline"),
            "preventive_actions": article.get("preventive_actions"),
            "full_text": text,
            "chunks": chunk_records,
            "article_embedding": article_embedding,
            "source_ticket_id": ticket_id,
            "ticket_transcript": transcript_excerpt,
            "validated_facts": article.get("validated_facts") or [],
            "published_at": approved_stamp,
            "approved_at": approved_stamp,
            "auto_generated": True,
            "approved": approval_mode,
            "source": "glpi_pipeline",
        }
        logger.info(
            "[KnowledgePipeline] Writing article %s for ticket %s into collection %s",
            article_doc_id,
            ticket_id,
            persona_collection.name,
        )
        persona_collection.replace_one({"_id": article_doc_id}, article_doc, upsert=True)
        logger.info(
            "[KnowledgePipeline] Article %s persisted with %s chunks",
            article_doc_id,
            len(chunk_records),
        )
        return str(article_doc_id)
