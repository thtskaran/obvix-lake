import os
import io
import time
import uuid
import logging
import json
import threading
import re
from xml.etree import ElementTree as ET
from typing import Any, Callable, Dict, List, Optional, Tuple, Set
from datetime import datetime, timedelta, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS

from google.oauth2 import service_account
from googleapiclient.discovery import build
from dotenv import load_dotenv
from googleapiclient.http import MediaIoBaseDownload
from openai import OpenAI
from pymongo import MongoClient, UpdateOne, errors, ASCENDING, DESCENDING
from bson import ObjectId

from services.agent_tools import AgentExecutionError, AgentTool, run_agentic_session
from services.analytics import TrendAnalyzer
from services.crm_enrichment import load_crm_enrichment_config
from services.feedback import FeedbackLoop
from services.glpi_service import (
    GLPIClient,
    GLPIEscalationManager,
    GLPISyncService,
    ResolutionExtractor,
)
from pypdf import PdfReader
from services.knowledge_pipeline import KnowledgePipeline
from services.rag_pipeline import HybridRAGPipeline
from services.ticket_router import TicketRouter
from services.docling_service import create_docling_converter


# ==============================================================================
# CONFIGURATION & GLOBAL STATE
# ==============================================================================


def _env_bool(name: str, default: str = "false") -> bool:
    return (os.environ.get(name, default) or "").strip().lower() in {"1", "true", "yes", "on"}


load_dotenv()

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logging.getLogger("googleapiclient.discovery").setLevel(logging.WARNING)

app = Flask(__name__)
CORS(app)

MONGO_URI = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
MONGO_DB_NAME = os.environ.get("MONGO_DB_NAME") or os.environ.get("MONGO_DB", "obvix_lake")
mongo_client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=int(os.environ.get("MONGO_TIMEOUT_MS", "5000")),
)
db = mongo_client[MONGO_DB_NAME]

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY environment variable must be set.")

OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL")
if OPENAI_BASE_URL:
    openai_client = OpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)
else:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

CHAT_MODEL = os.environ.get("CHAT_MODEL", "gpt-4o-mini")
EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-large")
RAG_JUDGE_MODEL = os.environ.get("RAG_JUDGE_MODEL", "gpt-4o-mini")
LLM_TEMP_LOW = float(os.environ.get("LLM_TEMP_LOW", "0.2"))
MAX_EMBED_CHARS = int(os.environ.get("MAX_EMBED_CHARS", "1200"))
MIN_ASSIST_TURNS = int(os.environ.get("MIN_ASSIST_TURNS", "2"))
MAX_ASSIST_TURNS = int(os.environ.get("MAX_ASSIST_TURNS", "4"))
MAX_HISTORY_MESSAGES_TO_RETRIEVE = int(os.environ.get("MAX_HISTORY_MESSAGES", "16"))

PERSONA_COLLECTION_PREFIX = os.environ.get("PERSONA_COLLECTION_PREFIX", "persona_")
DEFAULT_SUPPORT_PERSONA = os.environ.get("DEFAULT_SUPPORT_PERSONA", "ol_support")

CHAT_HISTORY_COL = os.environ.get("CHAT_HISTORY_COL", "chat_history")
USER_PROFILES_COL = os.environ.get("USER_PROFILES_COL", "user_profiles")
KNOWLEDGE_QUEUE_COL = os.environ.get("KNOWLEDGE_QUEUE_COL", "knowledge_pipeline_queue")
SYSTEM_METRICS_COL = os.environ.get("SYSTEM_METRICS_COL", "system_metrics")
SUPPORT_ESCALATIONS_COL = os.environ.get("SUPPORT_ESCALATIONS_COL", "support_escalations")
FEEDBACK_EVENTS_COL = os.environ.get("FEEDBACK_EVENTS_COL", "feedback_events")
TICKET_ROUTING_AUDIT_COL = os.environ.get("TICKET_ROUTING_AUDIT_COL", "ticket_routing_audit")
GLPI_SYNC_STATE_COL = os.environ.get("GLPI_SYNC_STATE_COL", "glpi_sync_state")
GLPI_RAW_TICKETS_COL = os.environ.get("GLPI_RAW_TICKETS_COL", "glpi_tickets")
GLPI_RESOLUTIONS_COL = os.environ.get("GLPI_RESOLUTIONS_COL", "glpi_resolutions")
ANALYTICS_CLUSTERS_COL = os.environ.get("ANALYTICS_CLUSTERS_COL", "analytics_clusters")

KNOWLEDGE_AUTO_APPROVE = _env_bool("KNOWLEDGE_AUTO_APPROVE", "true")
KNOWLEDGE_PIPELINE_INTERVAL_SECONDS = int(os.environ.get("KNOWLEDGE_PIPELINE_INTERVAL_SECONDS", "60"))
ANALYTICS_REFRESH_INTERVAL_SECONDS = int(os.environ.get("ANALYTICS_REFRESH_INTERVAL_SECONDS", "900"))
METRICS_REFRESH_INTERVAL_SECONDS = int(os.environ.get("METRICS_REFRESH_INTERVAL_SECONDS", "900"))
GLPI_SYNC_INTERVAL_SECONDS = int(os.environ.get("GLPI_SYNC_INTERVAL_SECONDS", "1800"))

RAG_TOP_K = int(os.environ.get("RAG_TOP_K", "5"))
RAG_MAX_CANDIDATES = int(os.environ.get("RAG_MAX_CANDIDATES", "400"))
RAG_BM25_WEIGHT = float(os.environ.get("RAG_BM25_WEIGHT", "0.40"))
RAG_SEMANTIC_WEIGHT = float(os.environ.get("RAG_SEMANTIC_WEIGHT", "0.60"))

PERSONA_FOLDER_LOCK = threading.Lock()
PERSONA_FOLDER_INDEX: Dict[str, str] = {}
PDF_MIME_TYPES = {"application/pdf"}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
GOOGLE_SERVICE_ACCOUNT_FILE = (
    os.environ.get("GOOGLE_SERVICE_ACCOUNT_FILE")
    or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    or os.path.join(BASE_DIR, "client.json")
)
GOOGLE_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
if not os.path.exists(GOOGLE_SERVICE_ACCOUNT_FILE):
    raise FileNotFoundError(
        f"Google service account file not found at {GOOGLE_SERVICE_ACCOUNT_FILE}. "
        "Set GOOGLE_SERVICE_ACCOUNT_FILE to the path of your credentials."
    )
drive_credentials = service_account.Credentials.from_service_account_file(
    GOOGLE_SERVICE_ACCOUNT_FILE,
    scopes=GOOGLE_SCOPES,
)
drive_service = build("drive", "v3", credentials=drive_credentials)

WATCH_FOLDER_ID = (
    os.environ.get("WATCH_FOLDER_ID")
    or os.environ.get("GOOGLE_DRIVE_WATCH_FOLDER_ID")
    or "root"
)

CRM_PROFILE_CONFIG_PATH = os.environ.get(
    "CRM_PROFILE_CONFIG_PATH",
    os.path.join(BASE_DIR, "config", "crm_profile_config.json"),
)
crm_enrichment_config = load_crm_enrichment_config(CRM_PROFILE_CONFIG_PATH)


def build_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    response = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


def short_completion(system_prompt: str, user_prompt: str, max_tokens: int = 120) -> str:
    try:
        response = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=0.2,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_tokens=max_tokens,
        )
        return (response.choices[0].message.content or "").strip()
    except Exception as exc:  # pragma: no cover - defensive
        logging.warning("short_completion failed: %s", exc)
        return ""


rag_pipeline = HybridRAGPipeline(
    db,
    PERSONA_COLLECTION_PREFIX,
    build_embeddings,
    openai_client,
    RAG_JUDGE_MODEL,
    top_k=RAG_TOP_K,
    max_candidates=RAG_MAX_CANDIDATES,
    bm25_weight=RAG_BM25_WEIGHT,
    semantic_weight=RAG_SEMANTIC_WEIGHT,
)

# Initialize Docling converter for advanced document processing
docling_converter = create_docling_converter(
    max_chunk_tokens=int(os.environ.get("DOCLING_MAX_CHUNK_TOKENS", "512")),
    preserve_tables=_env_bool("DOCLING_PRESERVE_TABLES", "true"),
    preserve_formatting=_env_bool("DOCLING_PRESERVE_FORMATTING", "true"),
)


GLPI_HOST = os.environ.get("GLPI_HOST")
GLPI_APP_TOKEN = os.environ.get("GLPI_APP_TOKEN")
GLPI_API_TOKEN = os.environ.get("GLPI_API_TOKEN")
GLPI_VERIFY_SSL = _env_bool("GLPI_VERIFY_SSL", "true")
GLPI_REQUEST_TIMEOUT = int(os.environ.get("GLPI_REQUEST_TIMEOUT", "20"))
GLPI_ENABLED = bool(GLPI_HOST and GLPI_APP_TOKEN and GLPI_API_TOKEN)

# ==============================================================================
# DRIVE HELPERS
# ==============================================================================
def fetch_plain_text(file_id: str, mime_type: str) -> str:
    """Fetch and extract text from Google Drive files.
    
    For PDFs and supported document types, uses Docling for advanced extraction
    with structure preservation. Falls back to simple text extraction for other types.
    """
    try:
        request_ = (
            drive_service.files().export_media(fileId=file_id, mimeType="text/plain")
            if "google-apps" in mime_type
            else drive_service.files().get_media(fileId=file_id)
        )
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request_)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        binary_data = fh.getvalue()
        
        # For Google Docs, just decode as text
        if "google-apps" in mime_type:
            return binary_data.decode("utf-8", errors="ignore")
        
        # For PDFs and other document types, use Docling for advanced extraction
        if mime_type in PDF_MIME_TYPES or mime_type in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",  # DOCX
            "application/msword",  # DOC
        }:
            docling_text = _extract_with_docling(binary_data, mime_type, file_id)
            if docling_text:
                return docling_text
            # Fallback to simple PDF extraction if Docling fails
            if mime_type in PDF_MIME_TYPES:
                pdf_text = _extract_pdf_text(binary_data, file_id)
                if pdf_text:
                    return pdf_text
        
        # Default: decode as text
        return binary_data.decode("utf-8", errors="ignore")
    except Exception as e:
        logging.error(f"Failed to fetch text for file {file_id}: {e}")
        return ""


def _extract_with_docling(data: bytes, mime_type: str, file_id: str) -> str:
    """Extract text from document using Docling with structure preservation."""
    if not data:
        return ""
    
    try:
        # Determine file extension from MIME type
        ext_map = {
            "application/pdf": ".pdf",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
            "application/msword": ".doc",
        }
        extension = ext_map.get(mime_type, ".pdf")
        filename = f"{file_id}{extension}"
        
        # Convert to Docling document
        docling_doc = docling_converter.convert_bytes_to_docling(data, mime_type, filename)
        if not docling_doc:
            logging.warning("Docling conversion failed for %s, will try fallback", file_id)
            return ""
        
        # Extract text (Docling preserves structure as markdown)
        text = docling_converter.extract_text_from_docling(docling_doc)
        if text:
            logging.info("Successfully extracted %d chars from %s using Docling", len(text), file_id)
        return text
        
    except Exception as exc:
        logging.warning("Docling extraction failed for %s: %s, will use fallback", file_id, exc)
        return ""


def _extract_pdf_text(data: bytes, file_id: str) -> str:
    if not data:
        return ""
    try:
        reader = PdfReader(io.BytesIO(data))
    except Exception as exc:
        logging.warning("Unable to read PDF %s: %s", file_id, exc)
        return ""
    pages: List[str] = []
    for idx, page in enumerate(reader.pages):
        try:
            text = page.extract_text() or ""
        except Exception as exc:  # pragma: no cover - defensive
            logging.warning("Failed to extract text from PDF %s page %s: %s", file_id, idx, exc)
            text = ""
        cleaned = text.replace("\u0000", "").strip()
        if cleaned:
            pages.append(cleaned)
    combined = "\n\n".join(pages).strip()
    if not combined:
        logging.info("PDF %s produced no extractable text; skipping.", file_id)
    return combined


def fetch_and_chunk_with_docling(file_id: str, mime_type: str, filename: str) -> List[Dict[str, Any]]:
    """Fetch a document and return semantic chunks using Docling.
    
    Returns a list of chunks with content and metadata, ready for embedding.
    Falls back to text-based chunking if Docling fails.
    """
    chunks_data: List[Dict[str, Any]] = []
    
    try:
        # Only use Docling for supported document types
        if mime_type not in PDF_MIME_TYPES and mime_type not in {
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/msword",
        }:
            # For other types, use standard text extraction
            logging.info("File %s (type %s) not supported by Docling, using standard extraction", filename, mime_type)
            text = fetch_plain_text(file_id, mime_type)
            simple_chunks = _split_text_for_embeddings(text)
            return [{"content": chunk, "metadata": {"filename": filename}} for chunk in simple_chunks]
        
        logging.info("Starting Docling chunking for %s (type: %s)", filename, mime_type)
        
        # Fetch file bytes
        request_ = drive_service.files().get_media(fileId=file_id)
        fh = io.BytesIO()
        downloader = MediaIoBaseDownload(fh, request_)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        binary_data = fh.getvalue()
        
        if not binary_data:
            logging.warning("No data retrieved for file %s", file_id)
            return []
        
        logging.info("Retrieved %d bytes for %s", len(binary_data), filename)
        
        # Convert to Docling document
        docling_doc = docling_converter.convert_bytes_to_docling(binary_data, mime_type, filename)
        if not docling_doc:
            logging.warning("Docling conversion failed for %s, using fallback chunking", filename)
            text = fetch_plain_text(file_id, mime_type)
            simple_chunks = _split_text_for_embeddings(text)
            return [{"content": chunk, "metadata": {"filename": filename}} for chunk in simple_chunks]
        
        logging.info("Docling conversion successful for %s, starting chunking", filename)
        
        # Get semantic chunks from Docling
        # Note: Docling v2+ uses text export internally, not page.elements
        doc_chunks = docling_converter.chunk_docling_document(docling_doc, filename)
        
        if not doc_chunks:
            logging.error("Docling chunking returned 0 chunks for %s! Using PyPDF fallback", filename)
            # Ultimate fallback to PyPDF
            text = fetch_plain_text(file_id, mime_type)
            if text:
                simple_chunks = _split_text_for_embeddings(text)
                return [{"content": chunk, "metadata": {"filename": filename}} for chunk in simple_chunks]
            return []
        
        # Merge very small chunks
        original_count = len(doc_chunks)
        doc_chunks = docling_converter.merge_small_chunks(doc_chunks, min_tokens=100)
        logging.info("Merged chunks: %d -> %d for %s", original_count, len(doc_chunks), filename)
        
        # Convert to dict format
        for chunk in doc_chunks:
            chunk_metadata = dict(chunk.metadata)
            chunk_metadata["chunk_type"] = chunk.chunk_type
            chunk_metadata["position"] = chunk.position
            
            # Add heading context
            if chunk.heading_hierarchy:
                chunk_metadata["headings"] = " > ".join(chunk.heading_hierarchy)
            
            chunks_data.append({
                "content": chunk.content,
                "metadata": chunk_metadata,
            })
        
        logging.info("Successfully created %d semantic chunks from %s using Docling", len(chunks_data), filename)
        return chunks_data
        
    except Exception as exc:
        logging.error("Failed to fetch and chunk %s with Docling: %s", filename, exc, exc_info=True)
        # Final fallback
        try:
            text = fetch_plain_text(file_id, mime_type)
            simple_chunks = _split_text_for_embeddings(text)
            return [{"content": chunk, "metadata": {"filename": filename}} for chunk in simple_chunks]
        except Exception as fallback_exc:
            logging.error("Fallback chunking also failed: %s", fallback_exc, exc_info=True)
            return []


def _parse_key_value_doc(text_content: str) -> Dict[str, Any]:
    profile_data = {}
    for line in text_content.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            profile_data[key.strip()] = value.strip()
    return profile_data


def _split_text_for_embeddings(text: str, max_chars: int = MAX_EMBED_CHARS) -> List[str]:
    text = (text or "").strip()
    if not text:
        return []

    paragraphs = re.split(r"\n\s*\n", text)
    chunks: List[str] = []
    current: List[str] = []
    current_length = 0

    def _flush_current():
        nonlocal current, current_length
        if current:
            combined = "\n\n".join(current).strip()
            if combined:
                chunks.append(combined)
        current = []
        current_length = 0

    for paragraph in paragraphs:
        para = paragraph.strip()
        if not para:
            continue
        if len(para) > max_chars:
            _flush_current()
            for idx in range(0, len(para), max_chars):
                segment = para[idx : idx + max_chars].strip()
                if segment:
                    chunks.append(segment)
            continue
        if current_length + len(para) + (2 if current else 0) > max_chars:
            _flush_current()
        current.append(para)
        current_length += len(para) + (2 if current_length else 0)

    _flush_current()

    if not chunks:
        return [text[:max_chars].strip()]

    return chunks


def _prepare_knowledge_segments(
    entries: List[Dict[str, Any]],
    default_source: str,
) -> List[Dict[str, Any]]:
    segments: List[Dict[str, Any]] = []
    for entry in entries:
        content = (entry.get("content") or "").strip()
        if not content:
            continue
        pieces = _split_text_for_embeddings(content)
        metadata = {
            "title": entry.get("title"),
            "tags": entry.get("tags", []),
            "source": default_source,
        }
        for idx, piece in enumerate(pieces):
            segment_metadata = dict(metadata)
            if len(pieces) > 1:
                segment_metadata["segment"] = idx + 1
            segments.append({"content": piece, "metadata": segment_metadata})
    return segments


def _xml_key_to_snake_case(value: Optional[str]) -> str:
    if not value:
        return ""
    interim = re.sub(r"([^0-9A-Za-z]+)", "_", value)
    interim = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", interim)
    return interim.strip("_").lower()


def _collect_profile_settings(node: ET.Element, settings: Dict[str, Any]) -> None:
    if node.attrib.get("name"):
        key_self = _xml_key_to_snake_case(node.attrib.get("name"))
        value_self = (node.text or "").strip()
        if key_self and value_self:
            settings[key_self] = value_self
    for element in list(node):
        tag = element.tag.lower()
        if tag in {"phrases", "knowledge"}:
            continue
        key_source = element.attrib.get("name") or element.tag
        key = _xml_key_to_snake_case(key_source)
        text_value = (element.text or "").strip()
        if key and text_value:
            settings[key] = text_value
        for sub in element.findall("setting"):
            sub_key = _xml_key_to_snake_case(sub.attrib.get("name") or sub.tag)
            sub_text = (sub.text or "").strip()
            if sub_key and sub_text:
                settings[sub_key] = sub_text


def _parse_persona_profile_xml(text_content: str) -> Tuple[Dict[str, Any], List[str], List[Dict[str, Any]]]:
    try:
        root = ET.fromstring(text_content)
    except ET.ParseError as exc:  # pragma: no cover - Input validation
        raise ValueError(f"Invalid persona XML: {exc}") from exc

    if root.tag.lower() != "persona":
        persona_node = root.find("persona")
        if persona_node is None:
            raise ValueError("Persona XML must contain a <persona> root element.")
        root = persona_node

    profile_settings: Dict[str, Any] = {}
    for attr_key, attr_value in root.attrib.items():
        key = _xml_key_to_snake_case(attr_key)
        if key and attr_value:
            profile_settings[key] = str(attr_value).strip()

    profile_node = root.find("profile") or root.find("settings")
    if profile_node is not None:
        _collect_profile_settings(profile_node, profile_settings)
    else:
        for element in root.findall("setting"):
            _collect_profile_settings(element, profile_settings)

    phrases: List[str] = []
    phrases_node = root.find("phrases")
    if phrases_node is not None:
        for phrase_node in phrases_node.findall(".//phrase"):
            text = (phrase_node.text or "").strip()
            if text:
                phrases.append(text)

    knowledge_entries: List[Dict[str, Any]] = []
    knowledge_node = root.find("knowledge")
    if knowledge_node is not None:
        for entry in list(knowledge_node):
            if not isinstance(entry.tag, str):  # Skip comments/processing instructions
                continue
            title = (entry.findtext("title") or entry.attrib.get("title") or "").strip()
            summary = (entry.findtext("summary") or "").strip()
            body = (entry.findtext("body") or entry.findtext("content") or "").strip()
            steps = [
                step.text.strip()
                for step in entry.findall(".//step")
                if step.text and step.text.strip()
            ]
            tips = [
                tip.text.strip()
                for tip in entry.findall("./tip")
                if tip.text and tip.text.strip()
            ]
            tags_node = entry.find("tags")
            tags: List[str] = []
            if tags_node is not None:
                tags = [
                    tag.text.strip()
                    for tag in tags_node.findall("tag")
                    if tag.text and tag.text.strip()
                ]
                if not tags and tags_node.text:
                    tags = [part.strip() for part in tags_node.text.split(",") if part.strip()]

            content_lines: List[str] = []
            if title:
                content_lines.append(title)
            if summary:
                content_lines.append(summary)
            if body:
                content_lines.append(body)
            if steps:
                content_lines.append("Steps:")
                content_lines.extend([f"{idx + 1}. {text}" for idx, text in enumerate(steps)])
            if tips:
                content_lines.append("Tips:")
                content_lines.extend([f"- {tip}" for tip in tips])

            for child in entry:
                tag_name = child.tag if isinstance(child.tag, str) else ""
                if tag_name in {"title", "summary", "body", "content", "step", "steps", "tip", "tags"}:
                    continue
                child_text = (child.text or "").strip()
                if child_text:
                    heading = child.attrib.get("label") or child.attrib.get("name") or tag_name
                    content_lines.append(f"{heading}: {child_text}")

            content = "\n".join(line.strip() for line in content_lines if line.strip()).strip()
            if not content:
                continue
            knowledge_entries.append({
                "title": title or None,
                "content": content,
                "tags": tags,
            })

    return profile_settings, phrases, knowledge_entries


def upsert_persona_document(persona_name: str, file_id: str, file_name: str, text_content: str):
    collection_name = f"{PERSONA_COLLECTION_PREFIX}{persona_name}"
    persona_collection = db[collection_name]
    doc_name_clean = os.path.splitext(file_name)[0].lower().strip()
    file_ext = os.path.splitext(file_name)[1].lower()

    if file_ext == ".xml" and doc_name_clean == "profile":
        try:
            profile_settings, phrases, knowledge_entries = _parse_persona_profile_xml(text_content)
        except ValueError as exc:
            logging.error("Skipping persona %s profile.xml due to parse error: %s", persona_name, exc)
            return

        persona_collection.update_one(
            {"file_id": file_id, "doc_type": "profile"},
            {
                "$set": {
                    "doc_type": "profile",
                    "file_id": file_id,
                    "content": profile_settings,
                }
            },
            upsert=True,
        )

        phrases_text = "\n".join(phrases).strip()
        if phrases:
            persona_collection.update_one(
                {"file_id": file_id, "doc_type": "phrases"},
                {
                    "$set": {
                        "doc_type": "phrases",
                        "file_id": file_id,
                        "content": phrases_text,
                    }
                },
                upsert=True,
            )
        else:
            persona_collection.delete_many({"file_id": file_id, "doc_type": "phrases"})

        persona_collection.delete_many(
            {"file_id": file_id, "doc_type": "knowledge", "source": "profile_xml"}
        )

        knowledge_segments = _prepare_knowledge_segments(knowledge_entries, "profile_xml")
        if knowledge_segments:
            embed_inputs = [segment["content"] for segment in knowledge_segments]
            try:
                embed_vectors = build_embeddings(embed_inputs)
            except Exception as exc:  # pragma: no cover - external service call
                logging.error("Embedding generation failed for persona %s: %s", persona_name, exc)
                embed_vectors = []

            operations = []
            for idx, segment in enumerate(knowledge_segments):
                embedding = embed_vectors[idx] if idx < len(embed_vectors) else None
                operations.append(
                    UpdateOne(
                        {"file_id": file_id, "doc_type": "knowledge", "chunk_index": idx},
                        {
                            "$set": {
                                "doc_type": "knowledge",
                                "file_id": file_id,
                                "chunk_index": idx,
                                "content": segment["content"],
                                "embedding": embedding,
                                "metadata": segment.get("metadata", {}),
                                "source": segment.get("metadata", {}).get("source", "profile_xml"),
                            }
                        },
                        upsert=True,
                    )
                )
            if operations:
                persona_collection.bulk_write(operations)
        return

    if doc_name_clean == "profile":
        profile_data = _parse_key_value_doc(text_content)
        if profile_data:
            persona_collection.update_one(
                {"file_id": file_id},
                {"$set": {"doc_type": "profile", "content": profile_data}},
                upsert=True,
            )
        return

    if doc_name_clean == "common_phrases":
        persona_collection.update_one(
            {"file_id": file_id},
            {"$set": {"doc_type": "phrases", "content": text_content}},
            upsert=True,
        )
        return

    chunks = _split_text_for_embeddings(text_content)
    if not chunks:
        return
    try:
        embeddings = build_embeddings(chunks)
    except Exception as exc:  # pragma: no cover - external service call
        logging.error("Embedding generation failed for persona %s: %s", persona_name, exc)
        embeddings = []
    operations = [
        UpdateOne(
            {"file_id": file_id, "chunk_index": i},
            {
                "$set": {
                    "doc_type": "knowledge",
                    "content": chunk,
                    "embedding": embeddings[i] if i < len(embeddings) else None,
                }
            },
            upsert=True,
        )
        for i, chunk in enumerate(chunks)
    ]
    if operations:
        persona_collection.bulk_write(operations)


def upsert_persona_document_chunks(
    persona_name: str,
    file_id: str,
    file_name: str,
    chunks_data: List[Dict[str, Any]],
):
    """Upsert pre-chunked document data (from Docling) into the persona collection.
    
    Args:
        persona_name: Name of the persona
        file_id: Google Drive file ID
        file_name: Original filename
        chunks_data: List of dicts with 'content' and 'metadata' keys
    """
    collection_name = f"{PERSONA_COLLECTION_PREFIX}{persona_name}"
    persona_collection = db[collection_name]
    
    if not chunks_data:
        logging.warning("No chunks provided for %s", file_name)
        return
    
    # Extract content for embedding
    chunk_contents = [chunk["content"] for chunk in chunks_data]
    
    # Generate embeddings for all chunks
    try:
        embeddings = build_embeddings(chunk_contents)
    except Exception as exc:
        logging.error("Embedding generation failed for persona %s file %s: %s", persona_name, file_name, exc)
        embeddings = []
    
    # Build bulk operations
    operations = []
    for idx, chunk_data in enumerate(chunks_data):
        embedding = embeddings[idx] if idx < len(embeddings) else None
        metadata = chunk_data.get("metadata", {})
        
        # Enhance metadata with file info
        metadata["file_id"] = file_id
        metadata["filename"] = file_name
        metadata["source"] = "docling_processed"
        
        operations.append(
            UpdateOne(
                {"file_id": file_id, "chunk_index": idx},
                {
                    "$set": {
                        "doc_type": "knowledge",
                        "file_id": file_id,
                        "chunk_index": idx,
                        "content": chunk_data["content"],
                        "embedding": embedding,
                        "metadata": metadata,
                        "chunk_type": metadata.get("chunk_type", "paragraph"),
                        "source": "docling_processed",
                    }
                },
                upsert=True,
            )
        )
    
    if operations:
        result = persona_collection.bulk_write(operations)
        logging.info(
            "Upserted %d Docling chunks for %s (matched: %d, modified: %d, upserted: %d)",
            len(operations),
            file_name,
            result.matched_count,
            result.modified_count,
            result.upserted_count,
        )


def _persona_slug(name: Optional[str]) -> str:
    return (name or "").lower().replace(" ", "_")


def _update_persona_folder_cache(persona_folders: List[Dict[str, Any]]):
    mapping = {}
    for folder in persona_folders:
        slug = _persona_slug(folder.get("name"))
        if slug:
            mapping[slug] = folder.get("id")
    with PERSONA_FOLDER_LOCK:
        PERSONA_FOLDER_INDEX.clear()
        PERSONA_FOLDER_INDEX.update({k: v for k, v in mapping.items() if v})


def _get_persona_folder_id(persona_slug: str) -> Optional[str]:
    with PERSONA_FOLDER_LOCK:
        return PERSONA_FOLDER_INDEX.get(persona_slug)


def _ensure_persona_folder(persona_slug: str) -> Optional[str]:
    folder_id = _get_persona_folder_id(persona_slug)
    if folder_id:
        return folder_id
    persona_folders = find_persona_folders_recursively(WATCH_FOLDER_ID)
    if persona_folders:
        _update_persona_folder_cache(persona_folders)
    return _get_persona_folder_id(persona_slug)



# ==============================================================================
# SYNCER
# ==============================================================================
def find_persona_folders_recursively(folder_id: str) -> List[Dict]:
    all_persona_folders = []
    page_token = None

    while True:
        try:
            response = (
                drive_service.files()
                .list(
                    q=f"'{folder_id}' in parents and trashed = false",
                    fields="nextPageToken, files(id, name, mimeType)",
                    supportsAllDrives=True,
                    includeItemsFromAllDrives=True,
                    pageToken=page_token,
                )
                .execute()
            )

            files = response.get("files", [])

            has_profile = any(
                f["name"].lower() in {"profile.txt", "profile.xml"}
                for f in files
            )
            if has_profile:
                folder_info = drive_service.files().get(fileId=folder_id, fields="name").execute()
                all_persona_folders.append({"id": folder_id, "name": folder_info["name"]})

            for item in files:
                if item["mimeType"] == "application/vnd.google-apps.folder":
                    all_persona_folders.extend(find_persona_folders_recursively(item["id"]))

            page_token = response.get("nextPageToken", None)
            if not page_token:
                break
        except Exception as e:
            logging.error(f"Error traversing folder {folder_id}: {e}")
            break

    return all_persona_folders


def sync_drive_personas_task():
    processed_files = {}
    while True:
        try:
            logging.info("Starting persona sync cycle...")
            persona_folders = find_persona_folders_recursively(WATCH_FOLDER_ID)
            logging.info(f"Found {len(persona_folders)} persona folders: {[f['name'] for f in persona_folders]}")
            _update_persona_folder_cache(persona_folders)
            for persona_folder in persona_folders:
                persona_name = persona_folder["name"].lower().replace(" ", "_")
                current_file_ids: Set[str] = set()
                files_resp = (
                    drive_service.files()
                    .list(
                        q=f"'{persona_folder['id']}' in parents and trashed = false",
                        fields="files(id, name, mimeType, modifiedTime)",
                        supportsAllDrives=True,
                        includeItemsFromAllDrives=True,
                    )
                    .execute()
                )
                for file in files_resp.get("files", []):
                    if "folder" in file["mimeType"]:
                        continue
                    file_id = file["id"]
                    modified_time = file["modifiedTime"]
                    current_file_ids.add(str(file_id))
                    if file_id not in processed_files or processed_files.get(file_id) != modified_time:
                        logging.info(f"Processing '{file['name']}' for persona '{persona_name}'...")
                        
                        # Use Docling for PDFs and DOCX for better chunking
                        mime_type = file["mimeType"]
                        use_docling = mime_type in PDF_MIME_TYPES or mime_type in {
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                            "application/msword",
                        }
                        
                        if use_docling:
                            # Use Docling-based semantic chunking
                            try:
                                chunks_data = fetch_and_chunk_with_docling(file_id, mime_type, file["name"])
                                if chunks_data:
                                    upsert_persona_document_chunks(persona_name, file_id, file["name"], chunks_data)
                                    processed_files[file_id] = modified_time
                                else:
                                    logging.warning("No chunks generated for %s, falling back to text extraction", file["name"])
                                    text = fetch_plain_text(file_id, mime_type)
                                    if text:
                                        upsert_persona_document(persona_name, file_id, file["name"], text)
                                        processed_files[file_id] = modified_time
                            except Exception as exc:
                                logging.error("Docling processing failed for %s: %s, using fallback", file["name"], exc)
                                text = fetch_plain_text(file_id, mime_type)
                                if text:
                                    upsert_persona_document(persona_name, file_id, file["name"], text)
                                    processed_files[file_id] = modified_time
                        else:
                            # Use standard text extraction for other file types
                            text = fetch_plain_text(file_id, mime_type)
                            if text:
                                upsert_persona_document(persona_name, file_id, file["name"], text)
                                processed_files[file_id] = modified_time
                persona_collection = db[f"{PERSONA_COLLECTION_PREFIX}{persona_name}"]
                existing_cursor = persona_collection.find({"file_id": {"$exists": True}}, {"file_id": 1})
                existing_ids = {str(doc.get("file_id")) for doc in existing_cursor if doc.get("file_id")}
                stale_ids = existing_ids - current_file_ids
                if stale_ids:
                    logging.info(
                        "Removing %d stale documents for persona '%s' (files deleted from Drive)",
                        len(stale_ids),
                        persona_name,
                    )
                    persona_collection.delete_many({"file_id": {"$in": list(stale_ids)}})
                    for stale_id in stale_ids:
                        processed_files.pop(stale_id, None)
        except Exception as e:
            logging.error(f"Error during sync loop: {e}")

        logging.info("Sync cycle finished. Waiting for 60 seconds.")
        time.sleep(60)


def glpi_sync_worker():
    if not glpi_sync_service:
        return
    glpi_sync_service.run_forever(GLPI_SYNC_INTERVAL_SECONDS)


def knowledge_pipeline_worker():
    while True:
        try:
            processed = knowledge_pipeline.process_next()
        except Exception as exc:  # pragma: no cover - defensive
            logging.error("Knowledge pipeline error: %s", exc)
            processed = False
        time.sleep(5 if processed else KNOWLEDGE_PIPELINE_INTERVAL_SECONDS)


def analytics_worker():
    while True:
        try:
            trend_analyzer.build_clusters()
        except Exception as exc:  # pragma: no cover - defensive
            logging.error("Trend analyzer error: %s", exc)
        time.sleep(ANALYTICS_REFRESH_INTERVAL_SECONDS)


def metrics_worker():
    while True:
        try:
            feedback_loop.compute_metrics()
        except Exception as exc:  # pragma: no cover - defensive
            logging.error("Metrics aggregation failed: %s", exc)
        time.sleep(METRICS_REFRESH_INTERVAL_SECONDS)


def _spawn_daemon(name: str, target):
    thread = threading.Thread(target=target, daemon=True, name=name)
    thread.start()
    return thread


def start_background_threads():
    try:
        initial_persona_folders = find_persona_folders_recursively(WATCH_FOLDER_ID)
        if initial_persona_folders:
            _update_persona_folder_cache(initial_persona_folders)
    except Exception as exc:
        logging.warning("Unable to prime persona folder cache: %s", exc)
    _spawn_daemon("drive_sync", sync_drive_personas_task)
    if glpi_sync_service:
        _spawn_daemon("glpi_sync", glpi_sync_worker)
    _spawn_daemon("knowledge_pipeline", knowledge_pipeline_worker)
    _spawn_daemon("analytics", analytics_worker)
    _spawn_daemon("metrics", metrics_worker)

# ==============================================================================
# HISTORY
# ==============================================================================
def save_message_to_history(user_id: str, role: str, content: str):
    # Store content as-is; _format_transcript() will add role prefixes when needed
    db[CHAT_HISTORY_COL].insert_one(
        {"user_id": user_id, "role": role, "content": content, "timestamp": datetime.now()}
    )


def get_relevant_history(user_id: str, k: int) -> list:
    history_cursor = db[CHAT_HISTORY_COL].find({"user_id": user_id}).sort("timestamp", DESCENDING).limit(k)
    return [{"role": msg["role"], "content": msg["content"]} for msg in reversed(list(history_cursor))]

# ==============================================================================
# PERSONA / RAG
# ==============================================================================


def get_persona_context(persona_name: str) -> tuple:
    collection_name = f"{PERSONA_COLLECTION_PREFIX}{persona_name}"
    persona_collection = db[collection_name]
    profile_doc = persona_collection.find_one({"doc_type": "profile"})
    model_settings = profile_doc["content"] if profile_doc else {}
    phrases_doc = persona_collection.find_one({"doc_type": "phrases"})
    common_phrases = phrases_doc["content"] if phrases_doc else ""
    logging.info(f"Loaded persona %s with settings keys: %s", persona_name, list(model_settings.keys()))
    return model_settings, common_phrases

# ==============================================================================
# LLM HELPERS
# ==============================================================================
def _llm_json_call(system_prompt: str, user_content: str, fallback: Dict[str, Any]) -> Dict[str, Any]:
    try:
        resp = openai_client.chat.completions.create(
            model=CHAT_MODEL,
            temperature=LLM_TEMP_LOW,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_content},
            ],
            max_tokens=300,
        )
        txt = resp.choices[0].message.content.strip()
        txt = txt.strip("`").strip()
        if txt.lower().startswith("json"):
            txt = txt[4:].strip()
        return json.loads(txt)
    except Exception as e:
        logging.warning(f"LLM JSON parse fallback: {e}")
        return fallback


# ============================================================================== 
# SERVICE LAYER SINGLETONS
# ==============================================================================
knowledge_pipeline = KnowledgePipeline(
    db,
    PERSONA_COLLECTION_PREFIX,
    DEFAULT_SUPPORT_PERSONA,
    _llm_json_call,
    build_embeddings,
    queue_collection=KNOWLEDGE_QUEUE_COL,
    auto_approve=KNOWLEDGE_AUTO_APPROVE,
)

ticket_router = TicketRouter(
    db,
    _llm_json_call,
    build_embeddings,
    PERSONA_COLLECTION_PREFIX,
    audit_collection=TICKET_ROUTING_AUDIT_COL,
)

trend_analyzer = TrendAnalyzer(
    db,
    resolution_collection=GLPI_RESOLUTIONS_COL,
    cluster_collection=ANALYTICS_CLUSTERS_COL,
    summarizer=short_completion,
)

feedback_loop = FeedbackLoop(
    db,
    feedback_collection=FEEDBACK_EVENTS_COL,
    metrics_collection=SYSTEM_METRICS_COL,
)

resolution_extractor = ResolutionExtractor(_llm_json_call, build_embeddings)

glpi_client: Optional[GLPIClient]
glpi_sync_service: Optional[GLPISyncService]
glpi_escalation_manager: Optional[GLPIEscalationManager]
if GLPI_ENABLED:
    glpi_client = GLPIClient(
        GLPI_HOST,
        GLPI_APP_TOKEN,
        GLPI_API_TOKEN,
        verify_ssl=GLPI_VERIFY_SSL,
        request_timeout=GLPI_REQUEST_TIMEOUT,
    )
    glpi_sync_service = GLPISyncService(
        db,
        glpi_client,
        resolution_extractor,
        resolution_handler=knowledge_pipeline.enqueue_resolution,
        state_collection=GLPI_SYNC_STATE_COL,
        raw_collection=GLPI_RAW_TICKETS_COL,
        resolution_collection=GLPI_RESOLUTIONS_COL,
        escalations_collection=SUPPORT_ESCALATIONS_COL,
    )
    glpi_escalation_manager = GLPIEscalationManager(glpi_client)
    logging.info("✅ GLPI integration enabled. Host: %s", GLPI_HOST)
else:
    glpi_client = None
    glpi_sync_service = None
    glpi_escalation_manager = None
    logging.warning("⚠️ GLPI integration disabled – missing GLPI_* environment variables.")


def infer_conversation_tone(history: List[Dict[str, str]]) -> Dict[str, Any]:
    system = (
        "Infer the user's tone from the conversation. "
        "Return STRICT JSON: {\"tone_observed\":\"neutral|formal|casual|friendly|frustrated|assertive\","
        "\"confidence\":0.0-1.0}."
    )
    joined = "\n".join([f"{m['role']}: {m['content']}" for m in history[-8:]])
    return _llm_json_call(system, joined, {"tone_observed": "neutral", "confidence": 0.5})

# ============================================================================== 
# CRM ENRICHMENT
# ==============================================================================
CRM_ALLOWED_FIELDS = crm_enrichment_config.field_names

def extract_and_upsert_profile_fields(user_id: str, message: str, history: Optional[List[Dict[str, str]]] = None):
    if not CRM_ALLOWED_FIELDS:
        return
    context = ""
    if history:
        context = "\nRecent history:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[-6:]])
    system = (
        "Extract structured CRM fields from the message and short history if available.\n"
        f"Only these keys: {CRM_ALLOWED_FIELDS}.\n"
        "Return a STRICT JSON object with any found keys. "
        "If a field is not present, omit it."
    )
    result = _llm_json_call(system, f"Message:\n{message}\n{context}", {})
    normalized_result = crm_enrichment_config.normalize(result)
    if "email" in CRM_ALLOWED_FIELDS and "email" not in normalized_result:
        m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", message or "")
        if m:
            normalized_result["email"] = m.group(0).lower()
    if not normalized_result:
        return
    db[USER_PROFILES_COL].update_one({"user_id": user_id}, {"$set": normalized_result}, upsert=True)

# ==============================================================================
# TEXT GENERATORS
# ==============================================================================
def resolve_model_name(model_settings: Dict[str, Any], persona_name: str) -> str:
    model_settings = model_settings or {}
    for key in ("model_name", "agent_name", "display_name", "persona_name"):
        name = model_settings.get(key)
        if name:
            return str(name)
    slug = persona_name or ""
    if slug.startswith("ol_"):
        slug = slug[3:]
    slug = slug.replace("_", " ").strip()
    return slug.title() if slug else "Agent"

def build_user_memory_snippet(user_profile: Dict[str, Any]) -> str:
    prioritized_keys = []
    for key in crm_enrichment_config.memory_priority + ["tone_preference", "tone_observed"]:
        if key not in prioritized_keys:
            prioritized_keys.append(key)

    items = []
    for key in prioritized_keys:
        value = user_profile.get(key)
        if value in (None, ""):
            continue
        if isinstance(value, (dict, list)):
            formatted = json.dumps(value, ensure_ascii=False)
        else:
            formatted = str(value)
        items.append(f"{key}: {formatted}")

    return "; ".join(items) if items else "No stored user facts."

# ==============================================================================
# MESSAGE CONSTRUCTION
# ==============================================================================
def build_router_context(router_payload: Optional[Dict[str, Any]]) -> str:
    if not router_payload:
        return "Router assessment unavailable for this turn."
    classification = router_payload.get("classification", {})
    parts = []
    if classification.get("issue_category"):
        parts.append(f"category={classification['issue_category']}")
    if classification.get("issue_type"):
        parts.append(f"type={classification['issue_type']}")
    if classification.get("urgency"):
        parts.append(f"urgency={classification['urgency']}")
    if classification.get("impact_scope"):
        parts.append(f"impact={classification['impact_scope']}")
    if classification.get("confidence") is not None:
        parts.append(f"confidence={classification['confidence']}")
    header = "Router classification: " + ", ".join(parts) if parts else "Router classification unavailable."
    matches = router_payload.get("matches") or []
    snippets = [f"- {match.get('content', '')[:320]}" for match in matches[:3] if match.get('content')]
    snippet_block = "\n".join(snippets) if snippets else "- No high-confidence knowledge snippets surfaced yet."
    return f"{header}\nSuggested references:\n{snippet_block}"


def construct_support_messages(
    model_settings,
    history,
    knowledge_block,
    common_phrases,
    user_profile: Dict[str, Any],
    persona_name: str,
    router_payload: Optional[Dict[str, Any]] = None,
):
    model_settings = model_settings or {}
    default_instruction = (
        "Answer the user's query using ONLY the provided knowledge snippets. "
        "If coverage is insufficient, acknowledge it honestly and suggest next steps or offer to connect with a human."
    )
    instruction = model_settings.get("support_instruction") or default_instruction
    tone_guidelines = model_settings.get("tone_guidelines") or model_settings.get("style_notes")
    approved_phrases = common_phrases or model_settings.get("approved_phrases") or "n/a"
    memory = build_user_memory_snippet(user_profile)
    tone_pref = user_profile.get("tone_preference", "")
    tone_obs = (user_profile.get("tone_observed") or "neutral")
    agent_name = resolve_model_name(model_settings, persona_name)
    persona_identity = (
        model_settings.get("model_identity")
        or model_settings.get("persona_identity")
        or model_settings.get("role_description")
        or "a senior support specialist"
    )
    router_context = build_router_context(router_payload)
    system_prompt = f"""
You are "{agent_name}", {persona_identity} for this persona.
Objective: {instruction}

Constraints:
- Use only approved knowledge below plus router guidance.
- Never invent fixes; if unsure, say you will escalate or gather more detail.
- Tone: match preference ({tone_pref or 'none'}) else observed tone ({tone_obs}).
- When giving steps, number them and keep each step under 25 words.
- Speak naturally like a support agent; do not mention internal document IDs or "limited confidence" disclaimers.
- Use these approved phrases when natural: {approved_phrases}
"""
    if tone_guidelines:
        system_prompt += f"\n- Style specifics: {tone_guidelines}"

    system_prompt += f"""

User memory: {memory}
Router context:\n{router_context}

Knowledge base snippets:\n{knowledge_block}

Self-RAG protocol:
1. BEFORE answering output [RELEVANT] if the knowledge is sufficient, otherwise output [IRRELEVANT].
2. If [IRRELEVANT], respond with a brief apology and offer to escalate or follow up with a human.
3. If [RELEVANT], answer the query using ONLY the provided knowledge in natural language (no citation brackets).
4. AFTER your answer, output [GROUNDED] if every claim is supported by the provided knowledge or [UNGROUNDED] otherwise.
5. Prefer [IRRELEVANT] or [UNGROUNDED] over guessing.
"""
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    return messages


def _sanitize_chunks_for_agent(chunks: Optional[List[Dict[str, Any]]]) -> List[Dict[str, Any]]:
    safe_chunks: List[Dict[str, Any]] = []
    if not chunks:
        return safe_chunks
    for chunk in chunks:
        preview = (chunk.get("preview") or chunk.get("content") or "").strip()
        safe_chunks.append(
            {
                "citation_id": chunk.get("citation_id"),
                "doc_id": chunk.get("doc_id"),
                "preview": preview[:800],
                "source": chunk.get("source"),
                "similarity": chunk.get("similarity_score"),
                "lexical_score": chunk.get("lexical_score"),
                "fusion_score": chunk.get("fusion_score"),
                "metadata": chunk.get("metadata", {}),
            }
        )
    return safe_chunks


def _build_agent_system_prompt(
    agent_name: str,
    model_settings: Dict[str, Any],
    tone_pref: str,
    tone_obs: str,
    assist_attempts: int,
    min_turns: int,
    max_turns: int,
) -> str:
    default_instruction = (
        "Answer the user's query using only approved knowledge sources. "
        "If coverage is insufficient, gather more detail or escalate by creating a ticket."
    )
    instruction = model_settings.get("support_instruction") or default_instruction
    tone_guidelines = model_settings.get("tone_guidelines") or model_settings.get("style_notes")
    persona_identity = (
        model_settings.get("model_identity")
        or model_settings.get("persona_identity")
        or model_settings.get("role_description")
        or "a senior support specialist"
    )

    prompt = f"""
You are "{agent_name}", {persona_identity} for this persona. Your task: {instruction}

You operate as an agentic assistant with access to tools. Think through problems step-by-step internally (do not reveal chain-of-thought) and decide which tool to call next. Always confirm facts with tools before answering.

Constraints:
- Match the customer's preferred tone ({tone_pref or 'none'}) or observed tone ({tone_obs}).
- Number troubleshooting steps and keep them concise (<25 words).
- Be transparent about uncertainties and offer next actions.
- If knowledge remains insufficient after {min_turns} assistive attempts (currently at {assist_attempts}), call the ticket tool to escalate. Do not promise escalation without using the tool.
"""
    if tone_guidelines:
        prompt += f"\n- Style guidance: {tone_guidelines}"

    prompt += "\n\nAvailable tools and guidance:\n"
    prompt += "1. get_router_signals(issue_summary) → classification, urgency, and routing advice.\n"
    prompt += "2. search_persona_knowledge(query) → retrieve validated knowledge snippets.\n"
    prompt += "3. retrieve_user_profile(fields?) → review stored CRM context.\n"
    prompt += "4. summarize_recent_history(limit?) → quick recap of the conversation.\n"
    prompt += "5. create_support_ticket(summary, reason) → escalate to a human; must call before telling the user you're escalating.\n"
    prompt += (
        "You may call tools multiple times. After gathering enough evidence, craft a natural, empathetic reply. "
        "Cite knowledge snippets descriptively (e.g., “One guide recommends…”) rather than raw IDs."
    )

    return prompt.strip()


def _build_support_agent_tools(
    *,
    persona_name: str,
    user_id: str,
    latest_user_message: str,
    history: List[Dict[str, str]],
    user_profile: Dict[str, Any],
    conversation_state: Dict[str, Any],
) -> Tuple[List[AgentTool], Dict[str, Any]]:
    tool_state: Dict[str, Any] = {
        "router": None,
        "router_calls": [],
        "rag_calls": [],
        "ticket": None,
    }

    def _router_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
        if not ticket_router:
            return {"status": "unavailable", "reason": "ticket_router_disabled"}
        summary = (arguments.get("issue_summary") or arguments.get("description") or latest_user_message or "").strip()
        if not summary:
            summary = "Customer needs assistance"
        ticket_id = arguments.get("ticket_id") or f"{user_id}-{int(time.time())}"
        payload = ticket_router.route_ticket(
            persona_name,
            summary,
            ticket_id=ticket_id,
            metadata={"persona": persona_name},
        )
        tool_state["router"] = payload
        tool_state["router_calls"].append(payload)
        db[USER_PROFILES_COL].update_one(
            {"user_id": user_id},
            {"$set": {"last_router_decision": payload}},
            upsert=True,
        )
        return {"status": "ok", "payload": payload}

    def _knowledge_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
        query = (arguments.get("query") or latest_user_message or "").strip()
        if not query:
            return {"status": "error", "error": "query_required"}
        context = rag_pipeline.build_context(persona_name, query)
        tool_state["rag_calls"].append(context)
        return {
            "status": "ok",
            "decision": context.get("decision"),
            "confidence": context.get("confidence"),
            "reason": context.get("reason"),
            "metrics": context.get("metrics"),
            "chunks": _sanitize_chunks_for_agent(context.get("chunks")),
        }

    def _ticket_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
        reason = (arguments.get("reason") or "Escalation requested by virtual agent").strip()
        summary = (arguments.get("summary") or latest_user_message or reason).strip()
        rag_context = tool_state["rag_calls"][-1] if tool_state["rag_calls"] else None
        router_payload = tool_state.get("router")
        ticket_id = record_escalation_case(
            user_id,
            persona_name,
            history,
            latest_user_message,
            router_payload,
            rag_context=rag_context,
            escalation_reason=reason,
            assistant_reply=summary,
        )
        ticket_id_str = str(ticket_id) if ticket_id is not None else None
        conversation_state["escalated"] = True
        conversation_state["glpi_ticket_id"] = ticket_id_str
        conversation_state["escalation_reason"] = reason
        tool_state["ticket"] = {
            "ticket_id": ticket_id_str,
            "reason": reason,
        }
        return {"status": "ok", "ticket_id": ticket_id_str, "reason": reason}

    def _profile_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
        fields = arguments.get("fields") or []
        if fields and isinstance(fields, list):
            subset = {key: user_profile.get(key) for key in fields}
        else:
            subset = {key: value for key, value in user_profile.items() if key != "_id"}
        serializable_subset = {
            key: (str(value) if isinstance(value, ObjectId) else value)
            for key, value in subset.items()
        }
        return {
            "status": "ok",
            "profile": serializable_subset,
            "memory": build_user_memory_snippet(user_profile),
        }

    def _history_tool(arguments: Dict[str, Any]) -> Dict[str, Any]:
        limit = int(arguments.get("limit", 8))
        transcript = _format_transcript(history, latest_user_message)
        lines = transcript.splitlines()[-limit:]
        return {"status": "ok", "transcript": "\n".join(lines)}

    tools = [
        AgentTool(
            name="get_router_signals",
            description="Classify the issue, get urgency, sentiment, and routing recommendation.",
            parameters={
                "type": "object",
                "properties": {
                    "issue_summary": {"type": "string", "description": "Short description of the issue."},
                    "ticket_id": {"type": "string", "description": "Optional ticket identifier override."},
                },
            },
            handler=_router_tool,
        ),
        AgentTool(
            name="search_persona_knowledge",
            description="Retrieve high-confidence knowledge snippets for this persona.",
            parameters={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Question or topic to search for."},
                },
                "required": ["query"],
            },
            handler=_knowledge_tool,
        ),
        AgentTool(
            name="create_support_ticket",
            description="Escalate to a human agent by creating a GLPI ticket.",
            parameters={
                "type": "object",
                "properties": {
                    "summary": {"type": "string", "description": "Summary included in the ticket."},
                    "reason": {"type": "string", "description": "Why the escalation is required."},
                },
                "required": ["reason"],
            },
            handler=_ticket_tool,
        ),
        AgentTool(
            name="retrieve_user_profile",
            description="Inspect stored CRM attributes for the current user.",
            parameters={
                "type": "object",
                "properties": {
                    "fields": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional subset of fields to retrieve.",
                    }
                },
            },
            handler=_profile_tool,
        ),
        AgentTool(
            name="summarize_recent_history",
            description="Review the recent conversation transcript for context.",
            parameters={
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Number of recent lines to return (default 8).",
                        "minimum": 1,
                        "maximum": 40,
                    }
                },
            },
            handler=_history_tool,
        ),
    ]

    return tools, tool_state


def _map_glpi_urgency(value: Optional[str]) -> int:
    mapping = {
        'low': 1,
        'medium': 2,
        'high': 3,
        'urgent': 4,
    }
    return mapping.get((value or '').lower(), 2)


def _map_glpi_impact(value: Optional[str]) -> int:
    mapping = {
        'single_user': 1,
        'multi_user': 2,
        'systemwide': 3,
    }
    return mapping.get((value or '').lower(), 2)


def _format_transcript(
    history: List[Dict[str, str]],
    latest_user_message: str,
    assistant_reply: Optional[str] = None,
) -> str:
    turns = history[-20:]
    lines = [f"{turn.get('role', 'unknown')}: {turn.get('content', '')}" for turn in turns]
    if latest_user_message:
        already_has_latest = bool(
            turns
            and turns[-1].get("role") == "user"
            and turns[-1].get("content") == latest_user_message
        )
        if not already_has_latest:
            lines.append(f"user: {latest_user_message}")
    if assistant_reply:
        lines.append(f"assistant: {assistant_reply}")
    return "\n".join(lines)


def _ticket_lookup_values(ticket_id: Any) -> List[Any]:
    if ticket_id is None:
        return []
    values: List[Any] = []
    for candidate in (ticket_id, str(ticket_id)):
        if candidate not in values:
            values.append(candidate)
    if isinstance(ticket_id, str):
        try:
            int_candidate = int(ticket_id)
        except (TypeError, ValueError):
            int_candidate = None
        else:
            if int_candidate not in values:
                values.append(int_candidate)
    return values


def _find_ticket_resolution(ticket_id: Any) -> Optional[Dict[str, Any]]:
    lookup_values = _ticket_lookup_values(ticket_id)
    if not lookup_values:
        return None
    return db[GLPI_RESOLUTIONS_COL].find_one({"ticket_id": {"$in": lookup_values}})


def _parse_possible_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        iso_candidate = text.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(iso_candidate)
        except ValueError:
            parsed = None
        if parsed is None:
            for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M", "%Y-%m-%d"):
                try:
                    parsed = datetime.strptime(text, fmt)
                    break
                except ValueError:
                    parsed = None
            if parsed is None:
                return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed
    return None


def _fetch_glpi_ticket_status(ticket_id: Any) -> Optional[Dict[str, Any]]:
    if not glpi_client or ticket_id is None:
        return None
    lookup_id: Any = ticket_id
    try:
        lookup_id = int(str(ticket_id))
    except (TypeError, ValueError):
        lookup_id = ticket_id
    try:
        ticket = glpi_client.get_ticket(lookup_id, include_details=False)
    except Exception as exc:  # pragma: no cover - defensive
        logging.warning("Failed to fetch GLPI ticket %s status: %s", ticket_id, exc)
        return None
    if not ticket:
        return None
    status_value = ticket.get("status")
    status_int: Optional[int]
    try:
        status_int = int(status_value) if status_value is not None else None
    except (TypeError, ValueError):
        status_int = None
    status_text = str(status_value).lower() if status_value is not None else ""
    closed_val = ticket.get("closedate") or ticket.get("solvedate")
    closed_at = _parse_possible_datetime(closed_val)
    closed = False
    if status_int is not None:
        closed = status_int >= 5
    elif status_text in {"closed", "solved", "resolved", "done"}:
        closed = True
    if closed and closed_at is None:
        closed_at = datetime.now(timezone.utc)
    return {
        "closed": closed,
        "status": status_value,
        "closed_at": closed_at,
        "raw_ticket": ticket,
    }


def _append_ticket_followup(user_id: str, persona_name: str, ticket_id: Any, message: str) -> None:
    if ticket_id is None:
        return
    ticket_id_str = str(ticket_id)
    now_ts = datetime.now(timezone.utc)
    update_doc = {
        "$set": {"updated_at": now_ts},
        "$push": {
            "customer_updates": {
                "timestamp": now_ts,
                "user_id": user_id,
                "message": message,
            }
        },
    }
    try:
        db[SUPPORT_ESCALATIONS_COL].update_one(
            {"user_id": user_id, "persona": persona_name, "ticket_id": ticket_id_str},
            update_doc,
        )
    except Exception as exc:  # pragma: no cover - defensive
        logging.warning("Failed to append ticket follow-up for %s/%s: %s", user_id, ticket_id, exc)


def _forward_chat_to_ticket(
    *,
    user_id: str,
    persona_name: str,
    ticket_entry: Dict[str, Any],
    user_message: str,
) -> Dict[str, Any]:
    ticket_id = ticket_entry.get("ticket_id")
    message_text = (user_message or "").strip()
    if not message_text:
        message_text = "[Customer sent an update without additional text]"

    forwarded = False
    forward_error: Optional[str] = None
    if glpi_escalation_manager and ticket_id:
        try:
            forwarded = glpi_escalation_manager.send_customer_response(ticket_id, message_text)
        except Exception as exc:  # pragma: no cover - defensive
            forward_error = str(exc)
            logging.error("Failed to forward customer update to GLPI ticket %s: %s", ticket_id, exc)

    _append_ticket_followup(user_id, persona_name, ticket_id, message_text)

    now_ts = datetime.now(timezone.utc)
    db[USER_PROFILES_COL].update_one(
        {"user_id": user_id},
        {
            "$set": {
                f"active_tickets.{persona_name}.last_forwarded_at": now_ts,
                f"active_tickets.{persona_name}.status": "open",
            }
        },
        upsert=True,
    )
    ticket_entry["last_forwarded_at"] = now_ts

    if ticket_id:
        ticket_display = f"ticket #{ticket_id}"
    else:
        ticket_display = "the support ticket in progress"

    if forwarded:
        ack_message = (
            f"Thanks for the update! I've added it to {ticket_display}. "
            "Our specialists will follow up soon."
        )
    else:
        if glpi_escalation_manager and ticket_id:
            ack_message = (
                f"Your message has been queued for {ticket_display}. "
                "I'll make sure the support team sees it."
            )
        else:
            ack_message = (
                "I've recorded your update for the open support ticket. "
                "We'll share it with a human specialist shortly."
            )
    if forward_error:
        ack_message += " (There was a temporary issue sending it upstream; the team has been notified.)"

    save_message_to_history(user_id, "assistant", ack_message)

    payload: Dict[str, Any] = {
        "message": ack_message,
        "confidence": "LOW",
        "escalation_deferred": False,
        "assist_attempts_with_kb": 0,
        "ticket_forwarded": True,
        "ticket_status": "open",
        "sources": [],
    }
    if ticket_id:
        payload["glpi_ticket_id"] = ticket_id
        payload["active_ticket"] = {
            "ticket_id": ticket_id,
            "status": "open",
            "last_forwarded_at": now_ts.isoformat(),
            "forwarded_via_glpi": forwarded,
        }
    return payload


def record_escalation_case(
    user_id: str,
    persona_name: str,
    history: List[Dict[str, str]],
    user_message: str,
    router_payload: Optional[Dict[str, Any]],
    rag_context: Optional[Dict[str, Any]] = None,
    escalation_reason: Optional[str] = None,
    assistant_reply: Optional[str] = None,
):
    transcript = _format_transcript(history, user_message, assistant_reply)
    classification = (router_payload or {}).get("classification", {})
    rag_chunks = (rag_context or {}).get("chunks") or []
    rag_metrics = (rag_context or {}).get("metrics") or {}
    similarity_scores = rag_metrics.get("similarity_scores") or []
    reason_text = escalation_reason or "Escalated based on routing rules"
    ticket_id = None
    if glpi_escalation_manager:
        try:
            resp = glpi_escalation_manager.create_escalation_ticket(
                user_query=user_message,
                escalation_reason=reason_text,
                retrieved_chunks=rag_chunks,
                similarity_scores=similarity_scores,
                conversation_context=transcript,
            )
            ticket_id = resp.get("ticket_id")
        except Exception as exc:
            logging.error("GLPI escalation ticket failed: %s", exc)
    elif glpi_client:
        body = (
            f"Persona: {persona_name}\nUser ID: {user_id}\n"
            f"Router classification: {json.dumps(classification, indent=2)}\n\n"
            f"Conversation transcript (latest first):\n{transcript}"
        )
        payload = {
            "name": f"[Auto Escalation] {classification.get('issue_category', 'Support case').title()} - {user_id}",
            "content": body,
            "status": 1,
            "type": 1,
            "urgency": _map_glpi_urgency(classification.get('urgency')),
            "impact": _map_glpi_impact(classification.get('impact_scope')),
            "requesttypes_id": 1,
        }
        try:
            resp = glpi_client.create_ticket(payload)
            ticket_id = resp.get("id") or resp.get("ticket_id")
        except Exception as exc:
            logging.error("GLPI fallback ticket failed: %s", exc)

    ticket_id_str = str(ticket_id) if ticket_id is not None else None
    doc = {
        "user_id": user_id,
        "persona": persona_name,
        "ticket_id": ticket_id_str,
        "escalation_reason": reason_text,
        "router_classification": classification,
        "router_payload": router_payload,
        "transcript": transcript,
        "rag_metrics": rag_metrics,
        "rag_chunks": [
            {
                "doc_id": chunk.get("doc_id"),
                "citation_id": chunk.get("citation_id"),
                "preview": chunk.get("preview") or (chunk.get("content") or "")[:200],
                "similarity": chunk.get("similarity_score"),
            }
            for chunk in rag_chunks
        ],
        "created_at": datetime.now(timezone.utc),
    }
    db[SUPPORT_ESCALATIONS_COL].insert_one(doc)
    now_ts = datetime.now(timezone.utc)
    active_ticket_doc = {
        "ticket_id": ticket_id_str,
        "status": "open",
        "opened_at": now_ts,
        "escalation_reason": reason_text,
    }
    if classification:
        active_ticket_doc["classification"] = classification
    if rag_metrics:
        active_ticket_doc["rag_metrics"] = rag_metrics
    profile_update: Dict[str, Any] = {
        "$set": {
            "last_support_handoff": now_ts,
            "last_glpi_ticket_id": ticket_id_str,
        }
    }
    if ticket_id_str is not None:
        profile_update["$set"][f"active_tickets.{persona_name}"] = active_ticket_doc
    db[USER_PROFILES_COL].update_one(
        {"user_id": user_id},
        profile_update,
        upsert=True,
    )
    return ticket_id


def persist_rag_metrics(
    user_id: str,
    persona_name: str,
    rag_context: Optional[Dict[str, Any]],
    escalated: bool,
    escalation_reason: Optional[str],
):
    if not rag_context:
        return
    metrics = rag_context.get("metrics") or {}
    try:
        db[SYSTEM_METRICS_COL].insert_one(
            {
                "user_id": user_id,
                "persona": persona_name,
                "timestamp": datetime.now(timezone.utc),
                "retrieval_metrics": metrics.get("retrieval_metrics"),
                "validation_metrics": metrics.get("validation_metrics"),
                "similarity_scores": metrics.get("similarity_scores"),
                "decision": rag_context.get("decision"),
                "confidence": rag_context.get("confidence"),
                "response_metrics": {
                    "escalated": escalated,
                    "escalation_reason": escalation_reason,
                },
            }
        )
    except Exception as exc:  # pragma: no cover - defensive
        logging.warning("Failed to persist RAG metrics: %s", exc)


# ==============================================================================
# HEALTH CHECKS
# ==============================================================================
_health_cache: Dict[str, Dict[str, Any]] = {}


def _cached_health_check(name: str, ttl_seconds: int, check_fn):
    now = time.time()
    cache_entry = _health_cache.get(name, {"ts": 0, "result": {}})
    if now - cache_entry.get("ts", 0) > ttl_seconds:
        try:
            result = check_fn()
        except Exception as exc:  # pragma: no cover - defensive
            result = {"status": "error", "error": str(exc)}
        cache_entry = {"ts": now, "result": result}
        _health_cache[name] = cache_entry
    return cache_entry["result"]


def _check_mongo():
    try:
        mongo_client.admin.command("ping")
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


def _check_drive():
    try:
        drive_service.files().get(fileId=WATCH_FOLDER_ID, fields="id").execute()
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


def _check_openai():
    try:
        openai_client.models.list()
        return {"status": "ok"}
    except Exception as exc:
        return {"status": "error", "error": str(exc)}


def _check_glpi():
    if not glpi_client:
        return {"status": "disabled", "reason": "GLPI integration not configured"}
    return glpi_client.health_check()


ASSISTANT_OUTCOME_RESPONSES = {
    'resolved': "Glad we could get that sorted. If anything else breaks, just send another message here.",
    'escalated': "I've captured the diagnostics and looped in a human specialist. They'll reach out shortly.",
    'follow_up': "I'll monitor things on our side. If the issue returns, share any new symptoms and we'll dig deeper.",
}


def _serialize_datetime(value: Any) -> Any:
    return value.isoformat() if isinstance(value, datetime) else value


def _serialize_queue_item(doc: Dict[str, Any]) -> Dict[str, Any]:
    resolution = doc.get("resolution") or {}
    resolution_copy = dict(resolution)
    closed_at = resolution_copy.get("closed_at")
    if isinstance(closed_at, datetime):
        resolution_copy["closed_at"] = closed_at.isoformat()
    resolution_copy.pop("summary_embedding", None)
    return {
        "id": str(doc.get("_id")),
        "resolution_id": doc.get("resolution_id"),
        "ticket_id": resolution.get("ticket_id"),
        "persona": doc.get("persona"),
        "status": doc.get("status"),
        "created_at": _serialize_datetime(doc.get("created_at")),
        "updated_at": _serialize_datetime(doc.get("updated_at")),
        "lead_reviewed_at": _serialize_datetime(doc.get("lead_reviewed_at")),
        "sme_reviewed_at": _serialize_datetime(doc.get("sme_reviewed_at")),
        "approval_mode": doc.get("approval_mode"),
        "approved_by": doc.get("approved_by"),
        "draft": doc.get("draft"),
        "resolution": resolution_copy,
    }


def _parse_object_id(value: str) -> Optional[ObjectId]:
    try:
        return ObjectId(value)
    except Exception:
        return None

# ==============================================================================
# API
# ==============================================================================
@app.route('/health', methods=['GET'])
def healthcheck():
    statuses = {
        "app": {"status": "ok", "time": datetime.now(timezone.utc).isoformat()},
        "mongo": _cached_health_check("mongo", 30, _check_mongo),
        "google_drive": _cached_health_check("drive", 60, _check_drive),
        "openai": _cached_health_check("openai", 60, _check_openai),
    }
    statuses["glpi"] = _cached_health_check("glpi", 120, _check_glpi)
    return jsonify(statuses)


@app.route('/knowledge/queue', methods=['GET'])
def knowledge_queue_endpoint():
    status_filter = request.args.get('status')
    limit_param = request.args.get('limit', '50')
    try:
        limit = max(1, min(int(limit_param), 200))
    except ValueError:
        return jsonify({"error": "limit must be an integer"}), 400
    if not status_filter and not KNOWLEDGE_AUTO_APPROVE:
        status_filter = "awaiting_approval"
    query = {"status": status_filter} if status_filter else {}
    cursor = (
        db[KNOWLEDGE_QUEUE_COL]
        .find(query)
        .sort("updated_at", DESCENDING)
        .limit(limit)
    )
    items = [_serialize_queue_item(doc) for doc in cursor]
    return jsonify({"items": items, "auto_approve": KNOWLEDGE_AUTO_APPROVE})


@app.route('/knowledge/queue/<item_id>/approve', methods=['POST'])
def approve_knowledge_queue_item(item_id: str):
    queue_id = _parse_object_id(item_id)
    if not queue_id:
        return jsonify({"error": "invalid queue id"}), 400
    payload = request.get_json() or {}
    reviewer = payload.get("reviewer") or "manual_reviewer"
    try:
        result = knowledge_pipeline.approve_queue_item(queue_id, reviewer)
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    return jsonify(result)


@app.route('/personas', methods=['GET'])
def list_personas():
    """Return the list of personas currently synced into MongoDB."""
    try:
        collection_names = db.list_collection_names()
    except Exception as exc:
        logging.error(f"Failed to enumerate persona collections: {exc}")
        return jsonify({"error": "Unable to list personas right now."}), 500

    personas = sorted(
        name[len(PERSONA_COLLECTION_PREFIX):]
        for name in collection_names
        if name.startswith(PERSONA_COLLECTION_PREFIX)
    )
    return jsonify({"personas": personas})


@app.route('/tickets/route', methods=['POST'])
def ticket_router_endpoint():
    if not ticket_router:
        return jsonify({"error": "Ticket router not initialized."}), 503
    data = request.get_json() or {}
    persona = (data.get('persona') or DEFAULT_SUPPORT_PERSONA).lower().replace(' ', '_')
    ticket_text = (data.get('description') or data.get('message') or '').strip()
    if not ticket_text:
        return jsonify({"error": "description is required."}), 400
    ticket_id = data.get('ticket_id') or str(uuid.uuid4())
    metadata = data.get('metadata') or {}
    result = ticket_router.route_ticket(persona, ticket_text, ticket_id=ticket_id, metadata=metadata)
    return jsonify(result)


@app.route('/analytics/trends', methods=['GET'])
def analytics_trends():
    clusters = trend_analyzer.list_clusters()
    for cluster in clusters:
        if cluster.get('_id'):
            cluster['_id'] = str(cluster['_id'])
        ts = cluster.get('last_updated')
        if isinstance(ts, datetime):
            cluster['last_updated'] = ts.isoformat()
    return jsonify({"clusters": clusters})


@app.route('/feedback', methods=['POST'])
def feedback_endpoint():
    data = request.get_json() or {}
    if 'rating' not in data:
        return jsonify({"error": "rating is required"}), 400
    feedback_id = feedback_loop.record_feedback(data)
    return jsonify({"feedback_id": feedback_id}), 201


@app.route('/metrics', methods=['GET'])
def metrics_endpoint():
    metrics = feedback_loop.latest_metrics()
    if not metrics:
        metrics = feedback_loop.compute_metrics()
    if metrics.get('_id'):
        metrics['_id'] = str(metrics['_id'])
    if metrics.get('timestamp') and isinstance(metrics['timestamp'], datetime):
        metrics['timestamp'] = metrics['timestamp'].isoformat()
    return jsonify(metrics)


@app.route('/chat', methods=['POST'])
def chat_handler():
    data = request.get_json() or {}
    raw_persona = (data.get('persona_name') or '').strip()
    if not raw_persona:
        return jsonify({"error": "persona_name is required and must match an ol_* Drive folder."}), 400
    persona_name = raw_persona.lower().replace(' ', '_')
    if not persona_name.startswith('ol_'):
        return jsonify({"error": "persona_name must start with 'ol_' and match the Drive folder name."}), 400
    user_id = (data.get('user_id') or '').strip()
    if not user_id:
        return jsonify({"error": "user_id is required."}), 400
    user_message = data.get('message', '')

    if user_message:
        save_message_to_history(user_id, "user", user_message)

    history = get_relevant_history(user_id, MAX_HISTORY_MESSAGES_TO_RETRIEVE)

    try:
        extract_and_upsert_profile_fields(user_id, user_message or "", history)
    except Exception:
        pass

    user_profile = db[USER_PROFILES_COL].find_one({"user_id": user_id}) or {}
    user_profile["user_id"] = user_id
    user_profile["message_count"] = user_profile.get("message_count", 0) + 1

    try:
        tone_info = infer_conversation_tone(history)
        db[USER_PROFILES_COL].update_one(
            {"user_id": user_id},
            {"$set": {"tone_observed": tone_info.get("tone_observed", "neutral")}},
            upsert=True
        )
        user_profile["tone_observed"] = tone_info.get("tone_observed", "neutral")
    except Exception:
        pass

    db[USER_PROFILES_COL].update_one(
        {"user_id": user_id},
        {"$inc": {"message_count": 1}},
        upsert=True
    )

    active_tickets_raw = user_profile.get("active_tickets")
    active_tickets = active_tickets_raw if isinstance(active_tickets_raw, dict) else {}
    user_profile["active_tickets"] = active_tickets
    active_ticket_entry = active_tickets.get(persona_name)
    ticket_section_closed: Optional[Dict[str, Any]] = None

    if active_ticket_entry:
        ticket_id = active_ticket_entry.get("ticket_id")
        resolution_doc = _find_ticket_resolution(ticket_id)
        status_info = None if resolution_doc else _fetch_glpi_ticket_status(ticket_id)
        is_closed = bool(resolution_doc) or bool(status_info and status_info.get("closed"))
        if is_closed:
            closed_val = (
                resolution_doc.get("closed_at") if resolution_doc else status_info.get("closed_at")
            )
            closed_dt = _parse_possible_datetime(closed_val)
            closed_recorded = closed_dt or datetime.now(timezone.utc)
            ticket_display = str(ticket_id) if ticket_id else "unknown"
            notice_message = (
                f"Support ticket #{ticket_display} has been marked resolved. I'm ready to assist you directly again."
            )
            save_message_to_history(user_id, "assistant", notice_message)
            history.append({"role": "assistant", "content": notice_message})
            update_ops = {
                "$unset": {f"active_tickets.{persona_name}": ""},
                "$set": {
                    "last_ticket_closed_id": str(ticket_id) if ticket_id else None,
                    "last_ticket_closed_at": closed_recorded,
                },
            }
            if status_info and status_info.get("status") is not None:
                update_ops["$set"]["last_ticket_status"] = status_info.get("status")
            db[USER_PROFILES_COL].update_one({"user_id": user_id}, update_ops, upsert=True)
            active_tickets.pop(persona_name, None)
            user_profile["active_tickets"] = active_tickets
            ticket_section_closed = {"ticket_id": str(ticket_id) if ticket_id else None, "notice": notice_message}
            if closed_dt:
                ticket_section_closed["closed_at"] = closed_dt.isoformat()
            elif isinstance(closed_val, str):
                ticket_section_closed["closed_at"] = closed_val
            else:
                ticket_section_closed["closed_at"] = closed_recorded.isoformat()
            if status_info and status_info.get("status") is not None:
                ticket_section_closed["status"] = status_info.get("status")
            if resolution_doc:
                resolution_summary = resolution_doc.get("solution_steps") or resolution_doc.get("problem_summary")
                if resolution_summary:
                    ticket_section_closed["resolution_summary"] = resolution_summary
            if ticket_id is not None:
                escalation_update: Dict[str, Any] = {
                    "$set": {
                        "closed_at": closed_recorded,
                    }
                }
                if status_info and status_info.get("status") is not None:
                    escalation_update["$set"]["ticket_status"] = status_info.get("status")
                db[SUPPORT_ESCALATIONS_COL].update_one(
                    {"user_id": user_id, "persona": persona_name, "ticket_id": str(ticket_id)},
                    escalation_update,
                )
        else:
            forwarded_payload = _forward_chat_to_ticket(
                user_id=user_id,
                persona_name=persona_name,
                ticket_entry=active_ticket_entry,
                user_message=user_message or "",
            )
            return jsonify(forwarded_payload), 200
    
    try:
        model_settings, common_phrases = get_persona_context(persona_name)
        if common_phrases:
            model_settings = dict(model_settings or {})
            model_settings.setdefault("approved_phrases", common_phrases)

        assist_attempts = int(user_profile.get("assist_attempts_with_kb", 0))
        conversation_state = {
            "escalated": False,
            "glpi_ticket_id": None,
            "escalation_reason": None,
        }
        tools, tool_state = _build_support_agent_tools(
            persona_name=persona_name,
            user_id=user_id,
            latest_user_message=user_message or "",
            history=history,
            user_profile=user_profile,
            conversation_state=conversation_state,
        )

        agent_name = resolve_model_name(model_settings, persona_name)
        system_prompt = _build_agent_system_prompt(
            agent_name,
            model_settings,
            user_profile.get("tone_preference", ""),
            user_profile.get("tone_observed", "neutral"),
            assist_attempts,
            MIN_ASSIST_TURNS,
            MAX_ASSIST_TURNS,
        )

        agent_messages = [{"role": "system", "content": system_prompt}]
        agent_messages.extend(history)
        agent_messages.append({"role": "user", "content": user_message or ""})

        try:
            agent_reply, tool_events = run_agentic_session(
                openai_client,
                model=CHAT_MODEL,
                messages=agent_messages,
                tools=tools,
                temperature=0.25,
            )
        except AgentExecutionError as exc:
            logging.error("Agentic flow failed: %s", exc)
            agent_reply = (
                "I'm sorry—something went wrong while preparing the next steps. "
                "Let me know if you'd like me to escalate this to a human specialist."
            )
            tool_events = []

        response_content = (agent_reply or "").strip() or (
            "I'm still checking on the best next step. Could you confirm any new details in the meantime?"
        )

        last_rag_context = tool_state["rag_calls"][-1] if tool_state["rag_calls"] else None
        router_payload = tool_state.get("router") or (
            tool_state["router_calls"][-1] if tool_state["router_calls"] else None
        )
        escalated = bool(conversation_state.get("escalated"))
        glpi_ticket_id = conversation_state.get("glpi_ticket_id")
        escalation_reason_text = conversation_state.get("escalation_reason")
        if glpi_ticket_id:
            escalated = True

        response_confidence = (last_rag_context or {}).get("confidence") or "LOW"
        sources: List[Dict[str, Any]] = []
        if last_rag_context:
            for idx, chunk in enumerate(last_rag_context.get("chunks") or [], start=1):
                preview = (chunk.get("preview") or chunk.get("content") or "").strip()
                sources.append(
                    {
                        "id": chunk.get("citation_id") or f"kb_doc_{idx:03d}",
                        "preview": preview[:400],
                        "source": chunk.get("source") or (chunk.get("metadata") or {}).get("source_ticket_id"),
                    }
                )

        classification = (router_payload or {}).get("classification", {})
        needs_supervisor = bool(classification.get("needs_supervisor"))
        router_requests_human = bool(router_payload and router_payload.get("route_to_human"))

        escalation_deferred = False
        next_attempts = assist_attempts

        if escalated:
            escalation_deferred = False
            next_attempts = 0
        else:
            if last_rag_context:
                has_chunks = bool(last_rag_context.get("chunks"))
                rag_decision = last_rag_context.get("decision")
                if (
                    (rag_decision == "escalate" or needs_supervisor or router_requests_human)
                    and has_chunks
                    and assist_attempts < MAX_ASSIST_TURNS
                ):
                    escalation_deferred = True
                    next_attempts = min(MAX_ASSIST_TURNS, assist_attempts + 1)
                else:
                    if has_chunks and last_rag_context.get("confidence") == "HIGH":
                        next_attempts = 0
                    elif has_chunks:
                        next_attempts = min(MAX_ASSIST_TURNS, assist_attempts + 1)
                    else:
                        next_attempts = 0
            else:
                next_attempts = 0

        if last_rag_context:
            persist_rag_metrics(
                user_id,
                persona_name,
                last_rag_context,
                escalated,
                escalation_reason_text,
            )

        save_message_to_history(user_id, "assistant", response_content)
        db[USER_PROFILES_COL].update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "last_bot_reply": datetime.now(timezone.utc),
                    "assist_attempts_with_kb": next_attempts,
                }
            },
            upsert=True,
        )

        payload: Dict[str, Any] = {
            "message": response_content,
            "confidence": response_confidence,
            "escalation_deferred": escalation_deferred,
            "assist_attempts_with_kb": next_attempts,
        }
        if router_payload:
            payload["router"] = router_payload
        if glpi_ticket_id:
            payload["glpi_ticket_id"] = glpi_ticket_id
        if sources:
            payload["sources"] = sources
        if ticket_section_closed:
            payload["ticket_section_closed"] = ticket_section_closed
        return jsonify(payload), 200

    except Exception as e:
        logging.error(f"Error in chat handler: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred."}), 500


if __name__ == "__main__":
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        start_background_threads()
    app.run(host="0.0.0.0", port=8001, debug=True)
