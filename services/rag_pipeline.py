"""Enterprise-grade RAG pipeline helpers (hybrid retrieval, validation, grounding)."""
from __future__ import annotations

import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
from statistics import mean
from typing import Any, Dict, Iterable, List, Optional, Sequence, Tuple

import numpy as np

from .rag_utils import extract_query_terms, stream_article_chunks, stream_manual_chunks

logger = logging.getLogger(__name__)


DEFAULT_TOP_K = 5
MAX_CONTEXT_PREVIEW_CHARS = 480
RRF_K = 60


def _tokenize(text: Optional[str]) -> List[str]:
    if not text:
        return []
    return re.findall(r"[a-z0-9]+", text.lower())


def _calculate_context_precision(query: str, chunks: Sequence[Dict[str, Any]]) -> float:
    tokens = set(_tokenize(query))
    if not tokens or not chunks:
        return 0.0
    relevant = 0
    for chunk in chunks:
        chunk_text = (chunk.get("content") or "").lower()
        matches = sum(1 for term in tokens if term in chunk_text)
        if matches >= 3:
            relevant += 1
    return relevant / max(len(chunks), 1)


def parse_self_rag_tokens(raw_response: str) -> Dict[str, Any]:
    """Extract reflection tokens and strip them from the assistant answer."""
    relevance_flag = None
    grounding_flag = None
    answer_text = raw_response or ""
    relevance_match = re.search(r"\[(RELEVANT|IRRELEVANT)\]", answer_text, re.IGNORECASE)
    grounding_match = re.search(r"\[(GROUNDED|UNGROUNDED)\]", answer_text, re.IGNORECASE)
    if relevance_match:
        relevance_flag = relevance_match.group(1).upper()
        answer_text = answer_text.replace(relevance_match.group(0), "", 1).strip()
    if grounding_match:
        grounding_flag = grounding_match.group(1).upper()
        answer_text = answer_text.replace(grounding_match.group(0), "", 1).strip()
    return {
        "answer": answer_text.strip(),
        "relevance_flag": relevance_flag,
        "grounding_flag": grounding_flag,
    }


def evaluate_grounding(answer: str, chunks: Sequence[Dict[str, Any]]) -> Dict[str, Any]:
    """Compute lightweight grounding score + citation stats (fallback when API unavailable)."""
    answer_terms = set(_tokenize(answer))
    chunk_terms: List[str] = []
    doc_ids = [chunk.get("citation_id") or chunk.get("doc_id") for chunk in chunks]
    for chunk in chunks:
        chunk_terms.extend(_tokenize(chunk.get("content")))
    chunk_term_set = set(chunk_terms)
    overlap = len(answer_terms & chunk_term_set)
    support_ratio = overlap / max(len(answer_terms), 1)
    support_ratio = float(min(max(support_ratio, 0.0), 1.0))
    citations_present = 0
    for doc_id in doc_ids:
        if not doc_id:
            continue
        pattern = re.escape(doc_id)
        if re.search(rf"\[{pattern}\]", answer):
            citations_present += 1
    return {
        "grounding_score": support_ratio,
        "citations_found": citations_present,
        "citations_total": len([doc_id for doc_id in doc_ids if doc_id]),
    }


@dataclass
class RetrievedChunk:
    doc_id: str
    content: str
    source: Optional[str]
    similarity_score: float
    lexical_score: float
    fusion_score: float
    citation_id: str
    metadata: Dict[str, Any]


class BM25Retriever:
    def __init__(self, k1: float = 1.9, b: float = 0.75) -> None:
        self.k1 = k1
        self.b = b

    def rank(self, query_terms: Sequence[str], candidates: Sequence[Dict[str, Any]], top_k: int) -> List[Tuple[str, float]]:
        if not query_terms or not candidates:
            return []
        N = len(candidates)
        avg_dl = sum(cand.get("doc_len", 0) for cand in candidates) / max(N, 1)
        doc_freq: Dict[str, int] = {}
        for term in query_terms:
            doc_freq[term] = sum(1 for cand in candidates if term in cand.get("term_freq", {}))
        scored: List[Tuple[str, float]] = []
        for cand in candidates:
            term_freq = cand.get("term_freq", {})
            if not term_freq:
                continue
            score = 0.0
            doc_len = cand.get("doc_len", 0)
            for term in query_terms:
                tf = term_freq.get(term, 0)
                if not tf:
                    continue
                df = doc_freq.get(term, 0)
                if df == 0:
                    continue
                idf = math.log(((N - df + 0.5) / (df + 0.5)) + 1)
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (doc_len / max(avg_dl, 1e-9)))
                score += idf * (numerator / max(denominator, 1e-9))
            if score > 0:
                scored.append((cand["doc_id"], float(score)))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]


class SemanticRetriever:
    def __init__(self, embedding_fn) -> None:
        self._embedding_fn = embedding_fn

    def rank(self, query: str, candidates: Sequence[Dict[str, Any]], top_k: int) -> List[Tuple[str, float]]:
        if not query.strip():
            return []
        embeddings = self._embedding_fn([query])
        if not embeddings:
            return []
        query_vec = np.array(embeddings[0])
        query_norm = np.linalg.norm(query_vec) or 1.0
        query_unit = query_vec / query_norm
        scored: List[Tuple[str, float]] = []
        for cand in candidates:
            embedding = cand.get("embedding")
            if not embedding:
                continue
            cand_vec = np.array(embedding)
            denom = np.linalg.norm(cand_vec) or 1.0
            similarity = float(np.dot(query_unit, cand_vec / denom))
            scored.append((cand["doc_id"], similarity))
        scored.sort(key=lambda item: item[1], reverse=True)
        return scored[:top_k]


class HybridRAGPipeline:
    def __init__(
        self,
        db,
        persona_prefix: str,
        embedding_fn,
        llm_client,
        judge_model: str,
        *,
        top_k: int = DEFAULT_TOP_K,
        max_candidates: int = 400,
        bm25_weight: float = 0.40,
        semantic_weight: float = 0.60,
    ) -> None:
        self.db = db
        self.persona_prefix = persona_prefix
        self.embedding_fn = embedding_fn
        self.llm_client = llm_client
        self.judge_model = judge_model
        self.top_k = top_k
        self.max_candidates = max_candidates
        self.bm25_weight = bm25_weight
        self.semantic_weight = semantic_weight
        self._bm25 = BM25Retriever()
        self._semantic = SemanticRetriever(self.embedding_fn)

    # ------------------------------------------------------------------
    def build_context(self, persona: str, query: str) -> Dict[str, Any]:
        persona_slug = persona.lower().replace(" ", "_")
        collection = self.db[f"{self.persona_prefix}{persona_slug}"]
        candidates = self._collect_candidates(collection)
        if not candidates:
            return {
                "decision": "escalate",
                "reason": "Knowledge base empty for persona",
                "chunks": [],
                "metrics": {},
                "confidence": "LOW",
                "response_prefix": "",
            }
        query_terms = extract_query_terms(query) or _tokenize(query)
        bm25_ranked = self._bm25.rank(query_terms, candidates, self.top_k)
        semantic_ranked = self._semantic.rank(query, candidates, self.top_k)
        fused_chunks = self._fuse_results(bm25_ranked, semantic_ranked, candidates)
        metrics = self._build_metrics(fused_chunks, bm25_ranked, semantic_ranked)
        validation = self._run_validation(query, fused_chunks, metrics)
        return {
            "decision": validation["decision"],
            "reason": validation.get("reason"),
            "chunks": fused_chunks,
            "metrics": validation.get("metrics", metrics),
            "confidence": validation.get("confidence", "HIGH"),
            "response_prefix": validation.get("response_prefix", ""),
        }

    # ------------------------------------------------------------------
    def _collect_candidates(self, persona_collection) -> List[Dict[str, Any]]:
        candidates: List[Dict[str, Any]] = []
        manual_cursor = (
            persona_collection.find({"doc_type": "knowledge", "content": {"$exists": True}})
            .limit(self.max_candidates)
        )
        for doc in stream_manual_chunks(manual_cursor, require_embedding=False):
            candidate = self._prepare_candidate(doc, prefix="manual")
            if candidate:
                candidates.append(candidate)
            if len(candidates) >= self.max_candidates:
                return candidates
        article_cursor = (
            persona_collection.find({"doc_type": "knowledge_article", "chunks": {"$exists": True}})
            .limit(self.max_candidates)
        )
        for chunk in stream_article_chunks(article_cursor, require_embedding=False):
            candidate = self._prepare_candidate(chunk, prefix="article")
            if candidate:
                candidates.append(candidate)
            if len(candidates) >= self.max_candidates:
                break
        return candidates

    def _prepare_candidate(self, raw: Dict[str, Any], prefix: str) -> Optional[Dict[str, Any]]:
        content = (raw.get("content") or "").strip()
        if not content:
            return None
        raw_id = raw.get("doc_id") or raw.get("_id") or raw.get("article_id")
        chunk_index = raw.get("chunk_index")
        doc_id = str(raw_id) if raw_id else f"{prefix}_{len(content):04d}_{chunk_index or 0}"
        if chunk_index is not None:
            doc_id = f"{doc_id}_chunk{chunk_index}"
        tokens = _tokenize(content)
        term_freq = Counter(tokens)
        embedding = raw.get("embedding")
        metadata = {
            "tags": raw.get("tags") or [],
            "source_ticket_id": raw.get("source_ticket_id"),
            "published_at": raw.get("published_at"),
            "title": raw.get("title"),
            "chunk_index": chunk_index,
            "source": raw.get("source"),
        }
        return {
            "doc_id": doc_id,
            "content": content,
            "embedding": embedding,
            "term_freq": term_freq,
            "doc_len": len(tokens) or 1,
            "metadata": metadata,
            "source": metadata.get("source") or metadata.get("source_ticket_id"),
        }

    def _fuse_results(
        self,
        bm25_ranked: Sequence[Tuple[str, float]],
        semantic_ranked: Sequence[Tuple[str, float]],
        candidates: Sequence[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        cand_lookup = {cand["doc_id"]: cand for cand in candidates}
        rrf_scores: Dict[str, float] = {}
        lexical_lookup = {doc_id: score for doc_id, score in bm25_ranked}
        semantic_lookup = {doc_id: score for doc_id, score in semantic_ranked}

        for rank, (doc_id, _) in enumerate(bm25_ranked, start=1):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + self.bm25_weight / (RRF_K + rank)
        for rank, (doc_id, _) in enumerate(semantic_ranked, start=1):
            rrf_scores[doc_id] = rrf_scores.get(doc_id, 0.0) + self.semantic_weight / (RRF_K + rank)

        ordered = sorted(rrf_scores.items(), key=lambda item: item[1], reverse=True)
        final_chunks: List[Dict[str, Any]] = []
        for idx, (doc_id, fusion_score) in enumerate(ordered[: self.top_k], start=1):
            cand = cand_lookup.get(doc_id)
            if not cand:
                continue
            citation_id = f"kb_doc_{idx:03d}"
            final_chunks.append(
                {
                    "doc_id": doc_id,
                    "citation_id": citation_id,
                    "content": cand.get("content", ""),
                    "source": cand.get("source"),
                    "metadata": cand.get("metadata", {}),
                    "embedding": cand.get("embedding"),
                    "similarity_score": float(semantic_lookup.get(doc_id, 0.0)),
                    "lexical_score": float(lexical_lookup.get(doc_id, 0.0)),
                    "fusion_score": float(fusion_score),
                    "preview": (cand.get("content", "")[:MAX_CONTEXT_PREVIEW_CHARS]).strip(),
                }
            )
        return final_chunks

    def _build_metrics(
        self,
        chunks: Sequence[Dict[str, Any]],
        bm25_ranked: Sequence[Tuple[str, float]],
        semantic_ranked: Sequence[Tuple[str, float]],
    ) -> Dict[str, Any]:
        lexical_scores = [score for _, score in bm25_ranked]
        similarity_scores = [score for _, score in semantic_ranked]
        return {
            "retrieval_metrics": {
                "avg_bm25_score": float(mean(lexical_scores)) if lexical_scores else 0.0,
                "avg_semantic_similarity": float(mean([c.get("similarity_score", 0.0) for c in chunks])) if chunks else 0.0,
                "top_1_similarity": float(max([c.get("similarity_score", 0.0) for c in chunks], default=0.0)),
                "context_precision": 0.0,  # filled during validation
                "chunk_count_non_zero": len([c for c in chunks if c.get("content")]),
            },
            "validation_metrics": {
                "relevance_judge_result": None,
                "self_rag_relevant": None,
                "self_rag_grounded": None,
                "grounding_score": None,
                "citations_found": 0,
                "citations_total": len(chunks),
            },
        }

    def _run_validation(self, query: str, chunks: Sequence[Dict[str, Any]], metrics: Dict[str, Any]) -> Dict[str, Any]:
        if not chunks:
            return {
                "decision": "escalate",
                "reason": "Hybrid retrieval returned 0 results",
                "metrics": metrics,
                "confidence": "LOW",
            }
        similarity_scores = [chunk.get("similarity_score", 0.0) for chunk in chunks]
        avg_similarity = float(mean(similarity_scores)) if similarity_scores else 0.0
        max_similarity = float(max(similarity_scores)) if similarity_scores else 0.0
        decision = "proceed"
        reason = None
        confidence = "HIGH"
        response_prefix = ""

        if avg_similarity < 0.40 or max_similarity < 0.45:
            decision = "escalate"
            reason = "Low semantic similarity across retrieved chunks"

        if decision == "proceed":
            judge_answer = self._judge_relevance(query, chunks)
            metrics["validation_metrics"]["relevance_judge_result"] = judge_answer
            if judge_answer == "NO":
                decision = "escalate"
                reason = "LLM Relevance Judge determined retrieved context insufficient"

        precision = _calculate_context_precision(query, chunks)
        metrics["retrieval_metrics"]["context_precision"] = precision
        if decision == "proceed" and precision < 0.4:
            decision = "escalate"
            reason = f"Context Precision {precision:.2f} below 0.4 threshold"
        elif decision == "proceed" and 0.4 <= precision < 0.6:
            confidence = "LOW"
            response_prefix = "I found limited information, but here's what I know: "

        metrics.setdefault("similarity_scores", similarity_scores)
        metrics.setdefault("avg_similarity", avg_similarity)
        metrics.setdefault("max_similarity", max_similarity)

        return {
            "decision": decision,
            "reason": reason,
            "metrics": metrics,
            "confidence": confidence,
            "response_prefix": response_prefix,
        }

    def _judge_relevance(self, query: str, chunks: Sequence[Dict[str, Any]]) -> str:
        if not self.llm_client or not self.judge_model:
            return "YES"
        documents = "\n\n".join((chunk.get("content") or "")[:1500] for chunk in chunks)
        user_prompt = f"""
QUERY: {query}

RETRIEVED DOCUMENTS:
{documents}

Question: Do these documents contain sufficient information to answer the query above?
Answer:
"""
        try:
            resp = self.llm_client.chat.completions.create(
                model=self.judge_model,
                temperature=0,
                max_tokens=2,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a relevance judge for a support chatbot. "
                            "Respond ONLY with YES or NO."
                        ),
                    },
                    {"role": "user", "content": user_prompt.strip()},
                ],
            )
            answer = (resp.choices[0].message.content or "").strip().upper()
            return "YES" if "YES" in answer else "NO"
        except Exception as exc:  # pragma: no cover - defensive
            logger.warning("Relevance judge failed: %s", exc)
            return "YES"


def format_chunks_for_prompt(chunks: Sequence[Dict[str, Any]]) -> str:
    if not chunks:
        return "No supporting documents retrieved."
    lines: List[str] = ["DOCUMENT REFERENCE:"]
    for chunk in chunks:
        citation_id = chunk.get("citation_id") or chunk.get("doc_id")
        snippet = (chunk.get("content") or "").strip()
        snippet = re.sub(r"\s+", " ", snippet)[:MAX_CONTEXT_PREVIEW_CHARS]
        lines.append(f"{citation_id}: {snippet}")
    lines.append("When answering, cite sources like [kb_doc_001].")
    return "\n".join(lines)

