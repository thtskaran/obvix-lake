"""Clustering & trend analytics for GLPI-derived resolutions."""
from __future__ import annotations

import logging
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional

import numpy as np
from sklearn.cluster import MiniBatchKMeans

logger = logging.getLogger(__name__)


class TrendAnalyzer:
    def __init__(
        self,
        db,
        embedding_field: str = "summary_embedding",
        resolution_collection: str = "glpi_resolutions",
        cluster_collection: str = "analytics_clusters",
        summarizer: Optional[Callable[[str, str, int], str]] = None,
    ) -> None:
        self.db = db
        self.embedding_field = embedding_field
        self.resolution_collection = resolution_collection
        self.cluster_collection = cluster_collection
        self.summarizer = summarizer

    # ------------------------------------------------------------------
    def _collect_documents(self, since: datetime, limit: int) -> List[Dict[str, Any]]:
        cursor = (
            self.db[self.resolution_collection]
            .find({"closed_at": {"$gte": since}})
            .sort("closed_at", -1)
            .limit(limit)
        )
        return list(cursor)

    def _summarize_cluster(self, items: List[Dict[str, Any]]) -> str:
        if not items:
            return ""
        if not self.summarizer:
            return items[0].get("problem_summary", "")
        summaries = [doc.get("problem_summary") or "" for doc in items[:5]]
        prompt = "\n".join(f"- {text}" for text in summaries if text)
        system = "Summarize the common issue across these support tickets in <=25 words."
        try:
            return self.summarizer(system, prompt, 80)
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Cluster summarizer failed: %s", exc)
            return summaries[0] if summaries else ""

    def _trend_direction(self, timestamps: List[datetime]) -> str:
        if len(timestamps) < 2:
            return "stable"
        now = datetime.now(timezone.utc)
        recent = sum(1 for ts in timestamps if ts >= now - timedelta(hours=48))
        previous = sum(1 for ts in timestamps if now - timedelta(hours=96) <= ts < now - timedelta(hours=48))
        if previous == 0 and recent > 0:
            return "emerging"
        if previous == 0:
            return "stable"
        change = (recent - previous) / max(previous, 1)
        if change >= 0.3:
            return "growing"
        if change <= -0.3:
            return "declining"
        return "stable"

    def build_clusters(self, window_hours: int = 168, max_docs: int = 200) -> Optional[List[Dict[str, Any]]]:
        since = datetime.now(timezone.utc) - timedelta(hours=window_hours)
        docs = self._collect_documents(since, limit=max_docs)
        if len(docs) < 6:
            logger.info("Not enough GLPI resolutions for clustering (need >=6, got %s)", len(docs))
            return None
        embeddings = [doc.get(self.embedding_field) for doc in docs if doc.get(self.embedding_field)]
        if len(embeddings) < 6:
            logger.info("Not enough embeddings for clustering")
            return None
        n_clusters = max(2, min(6, len(embeddings) // 3))
        model = MiniBatchKMeans(n_clusters=n_clusters, random_state=42, batch_size=max(10, n_clusters * 2))
        labels = model.fit_predict(np.array(embeddings))
        bucket: Dict[int, List[Dict[str, Any]]] = defaultdict(list)
        idx = 0
        for doc in docs:
            if not doc.get(self.embedding_field):
                continue
            bucket[labels[idx]].append(doc)
            idx += 1
        results: List[Dict[str, Any]] = []
        for cluster_id, items in bucket.items():
            timestamps = [doc.get("closed_at") for doc in items if isinstance(doc.get("closed_at"), datetime)]
            summary = self._summarize_cluster(items)
            all_entities = [entity for doc in items for entity in doc.get("entities", [])]
            top_entities = [entity for entity, _ in Counter(all_entities).most_common(5)]
            record = {
                "cluster_id": int(cluster_id),
                "label": summary,
                "size": len(items),
                "trend": self._trend_direction([ts for ts in timestamps if isinstance(ts, datetime)]),
                "top_entities": top_entities,
                "ticket_ids": [doc.get("ticket_id") for doc in items],
                "last_updated": datetime.now(timezone.utc),
            }
            results.append(record)
        self.db[self.cluster_collection].delete_many({})
        if results:
            self.db[self.cluster_collection].insert_many(results)
        return results

    def list_clusters(self) -> List[Dict[str, Any]]:
        return list(self.db[self.cluster_collection].find().sort("size", -1))
