"""Feedback ingestion and metric tracking utilities."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from dateutil import parser as date_parser

logger = logging.getLogger(__name__)


class FeedbackLoop:
    def __init__(
        self,
        db,
        feedback_collection: str = "feedback_events",
        metrics_collection: str = "system_metrics",
    ) -> None:
        self.db = db
        self.feedback_collection = feedback_collection
        self.metrics_collection = metrics_collection

    # ------------------------------------------------------------------
    def record_feedback(self, payload: Dict[str, Any]) -> str:
        doc = {
            "source": payload.get("source", "customer"),
            "rating": payload.get("rating"),
            "comment": payload.get("comment"),
            "ticket_id": payload.get("ticket_id"),
            "persona": payload.get("persona"),
            "created_at": datetime.now(timezone.utc),
        }
        result = self.db[self.feedback_collection].insert_one(doc)
        return str(result.inserted_id)

    def compute_metrics(self) -> Dict[str, Any]:
        now = datetime.now(timezone.utc)
        thirty_days_ago = now - timedelta(days=30)
        routing_coll = self.db["ticket_routing_audit"]
        auto_rate = 0.0
        auto_count = routing_coll.count_documents({"decision": "auto_resolved", "timestamp": {"$gte": thirty_days_ago}})
        manual_count = routing_coll.count_documents({"decision": "human_agent", "timestamp": {"$gte": thirty_days_ago}})
        total = auto_count + manual_count
        auto_rate = (auto_count / total) if total else 0.0
        feedback_coll = self.db[self.feedback_collection]
        customer_feedback = list(feedback_coll.find({"source": "customer", "created_at": {"$gte": thirty_days_ago}}))
        avg_csat = 0.0
        if customer_feedback:
            ratings = [float(doc.get("rating", 0)) for doc in customer_feedback if doc.get("rating") is not None]
            avg_csat = sum(ratings) / len(ratings) if ratings else 0.0
        persona_kb_collections = [name for name in self.db.list_collection_names() if name.startswith("persona_")]
        auto_articles = 0
        manual_articles = 0
        for name in persona_kb_collections:
            coll = self.db[name]
            auto_articles += coll.count_documents(
                {
                    "doc_type": "knowledge_article",
                    "source": "glpi_pipeline",
                    "published_at": {"$gte": thirty_days_ago},
                }
            )
            manual_articles += coll.count_documents(
                {
                    "doc_type": "knowledge",
                    "source": {"$exists": False},
                }
            )
        manual_articles = max(1, manual_articles)
        knowledge_ratio = (auto_articles / manual_articles) if auto_articles else 0.0
        metrics = {
            "timestamp": now,
            "auto_resolution_rate": auto_rate,
            "auto_resolved": auto_count,
            "human_agent": manual_count,
            "avg_csat": avg_csat,
            "knowledge_growth_ratio": knowledge_ratio,
        }
        resolution_coll = self.db.get("glpi_resolutions")
        if resolution_coll:
            durations = []
            cursor = resolution_coll.find({"closed_at": {"$gte": thirty_days_ago}, "raw_ticket.date": {"$exists": True}})
            for doc in cursor:
                closed_at = doc.get("closed_at")
                opened = doc.get("raw_ticket", {}).get("date")
                if not closed_at or not opened:
                    continue
                if not isinstance(closed_at, datetime):
                    continue
                opened_dt = None
                if isinstance(opened, datetime):
                    opened_dt = opened
                elif isinstance(opened, str):
                    try:
                        opened_dt = date_parser.parse(opened)
                    except (ValueError, TypeError):
                        opened_dt = None
                if not opened_dt:
                    continue
                try:
                    duration = (closed_at - opened_dt).total_seconds()
                except Exception:
                    continue
                durations.append(duration)
            if durations:
                metrics["avg_resolution_hours"] = (sum(durations) / len(durations)) / 3600
        self.db[self.metrics_collection].insert_one(metrics)
        return metrics

    def latest_metrics(self) -> Optional[Dict[str, Any]]:
        return self.db[self.metrics_collection].find_one(sort=[("timestamp", -1)])
