"""Knowledge base expansion pipeline built atop GLPI resolutions."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np

logger = logging.getLogger(__name__)


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
        articles_collection: str = "knowledge_articles",
    ) -> None:
        self.db = db
        self.persona_prefix = persona_prefix
        self.default_persona = default_persona
        self._llm_json_fn = llm_json_fn
        self._embedding_fn = embedding_fn
        self.queue_collection = queue_collection
        self.articles_collection = articles_collection

    # ------------------------------------------------------------------
    def enqueue_resolution(self, resolution_doc: Dict[str, Any], persona: Optional[str] = None) -> None:
        persona_slug = (persona or self.default_persona).lower().replace(" ", "_")
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
        persona = doc.get("persona") or self.default_persona
        resolution = doc.get("resolution", {})
        draft = self._draft_article(resolution)
        if not draft:
            self.db[self.queue_collection].update_one(
                {"_id": doc["_id"]},
                {"$set": {"status": "error", "error": "draft_failed", "updated_at": datetime.now(timezone.utc)}},
            )
            return False
        self.db[self.queue_collection].update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": "lead_review", "draft": draft, "updated_at": datetime.now(timezone.utc)}},
        )
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
                }
            },
        )
        publish_result = self._publish_article(persona, draft, resolution)
        status = "published" if publish_result else "error"
        self.db[self.queue_collection].update_one(
            {"_id": doc["_id"]},
            {"$set": {"status": status, "published_article_id": publish_result, "updated_at": datetime.now(timezone.utc)}},
        )
        return bool(publish_result)

    # ------------------------------------------------------------------
    def _draft_article(self, resolution: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not resolution:
            return None
        system = (
            "You are a technical writer. Turn the structured resolution data into a concise knowledge article. "
            "Return JSON with title, summary, steps (array), audience (internal|customer), tags (array), and full_text."
        )
        body = {
            "problem": resolution.get("problem_summary"),
            "root_cause": resolution.get("root_cause"),
            "steps": resolution.get("solution_steps"),
            "entities": resolution.get("entities"),
            "resolution_type": resolution.get("resolution_type"),
        }
        fallback = {
            "title": resolution.get("title") or resolution.get("problem_summary") or "Untitled fix",
            "summary": resolution.get("problem_summary") or "",
            "steps": resolution.get("solution_steps") or [],
            "audience": "internal",
            "tags": resolution.get("entities") or [],
            "full_text": f"Problem: {resolution.get('problem_summary')}\nSolution: {'; '.join(resolution.get('solution_steps', []))}",
        }
        article = self._llm_json_fn(system, str(body), fallback)
        if not article.get("full_text"):
            article["full_text"] = fallback["full_text"]
        return article

    def _check_duplicate(self, persona: str, embedding: List[float]) -> Optional[Dict[str, Any]]:
        existing = list(
            self.db[self.articles_collection].find({"persona": persona, "article_embedding": {"$exists": True}})
        )
        if not existing:
            return None
        similarities = [(_cosine(embedding, doc["article_embedding"]), doc) for doc in existing]
        similarities.sort(key=lambda pair: pair[0], reverse=True)
        top = similarities[0]
        if top[0] >= 0.9:
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

    def _publish_article(self, persona: str, article: Dict[str, Any], resolution: Dict[str, Any]) -> Optional[str]:
        text = article.get("full_text") or ""
        if not text:
            return None
        article_embedding = self._embedding_fn([article.get("summary", text)])[0]
        duplicate = self._check_duplicate(persona, article_embedding)
        if duplicate:
            logger.info(
                "Duplicate knowledge detected (ticket %s matches article %s)",
                resolution.get("ticket_id"),
                duplicate.get("_id"),
            )
            return str(duplicate.get("_id"))
        chunks = self._split_chunks(text)
        embeddings = self._embedding_fn(chunks)
        persona_collection = self.db[f"{self.persona_prefix}{persona}"]
        chunk_records = []
        for idx, chunk in enumerate(chunks):
            record = {
                "doc_type": "knowledge",
                "content": chunk,
                "embedding": embeddings[idx],
                "source": "glpi_pipeline",
                "ticket_id": resolution.get("ticket_id"),
                "chunk_index": idx,
                "created_at": datetime.now(timezone.utc),
            }
            persona_collection.update_one(
                {"ticket_id": resolution.get("ticket_id"), "chunk_index": idx, "source": "glpi_pipeline"},
                {"$set": record},
                upsert=True,
            )
            chunk_records.append(record)
        article_doc = {
            "persona": persona,
            "title": article.get("title"),
            "summary": article.get("summary"),
            "audience": article.get("audience"),
            "tags": article.get("tags", []),
            "chunks": chunk_records,
            "article_embedding": article_embedding,
            "source_ticket_id": resolution.get("ticket_id"),
            "published_at": datetime.now(timezone.utc),
        }
        result = self.db[self.articles_collection].insert_one(article_doc)
        return str(result.inserted_id)
