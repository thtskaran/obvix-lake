"""Shared helpers for RAG-driven lookups across the app."""
from __future__ import annotations

import re
from typing import Any, Dict, Iterator, List, Optional, Set

COMMON_STOPWORDS: Set[str] = {
    "the",
    "and",
    "for",
    "with",
    "that",
    "from",
    "this",
    "have",
    "when",
    "your",
    "into",
    "onto",
    "about",
    "issue",
    "ticket",
    "agent",
    "user",
    "customer",
    "client",
    "please",
    "need",
    "needs",
    "error",
    "cant",
    "cannot",
    "unable",
    "case",
    "problem",
    "help",
}


def extract_query_terms(text: Optional[str], limit: int = 6, stopwords: Optional[Set[str]] = None) -> List[str]:
    if not text:
        return []
    chosen_stopwords = stopwords or COMMON_STOPWORDS
    tokens = re.findall(r"[a-z0-9]+", text.lower())
    terms: List[str] = []
    for token in tokens:
        if token in chosen_stopwords or len(token) < 3:
            continue
        if token in terms:
            continue
        terms.append(token)
        if len(terms) >= limit:
            break
    return terms


def manual_doc_to_chunk(doc: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "content": doc.get("content"),
        "embedding": doc.get("embedding"),
        "tags": doc.get("tags") or [],
        "doc_id": str(doc.get("_id")) if doc.get("_id") else None,
        "approved_at": doc.get("approved_at"),
        "created_at": doc.get("created_at"),
        "source": doc.get("source"),
    }


def iter_article_chunks(article_doc: Dict[str, Any]) -> Iterator[Dict[str, Any]]:
    tags = article_doc.get("tags") or []
    article_id = article_doc.get("_id")
    published_at = article_doc.get("published_at")
    ticket_id = article_doc.get("source_ticket_id")
    title = article_doc.get("title")
    for chunk in article_doc.get("chunks", []) or []:
        content = chunk.get("content")
        if not content:
            continue
        yield {
            "content": content,
            "embedding": chunk.get("embedding"),
            "chunk_index": chunk.get("chunk_index"),
            "article_id": str(article_id) if article_id else None,
            "tags": tags,
            "published_at": published_at,
            "source_ticket_id": ticket_id,
            "title": title,
        }


def stream_manual_chunks(cursor, require_embedding: bool = False) -> Iterator[Dict[str, Any]]:
    for doc in cursor:
        chunk = manual_doc_to_chunk(doc)
        content = chunk.get("content")
        embedding = chunk.get("embedding")
        if not content:
            continue
        if require_embedding and not embedding:
            continue
        yield chunk


def stream_article_chunks(cursor, require_embedding: bool = False) -> Iterator[Dict[str, Any]]:
    for article in cursor:
        for chunk in iter_article_chunks(article):
            content = chunk.get("content")
            embedding = chunk.get("embedding")
            if not content:
                continue
            if require_embedding and not embedding:
                continue
            yield chunk
