import os
import io
import time
import uuid
import logging
import json
import threading
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from openai import OpenAI
from pymongo import MongoClient, UpdateOne, errors, ASCENDING, DESCENDING
from dotenv import load_dotenv
import numpy as np

from services.glpi_service import GLPIClient, ResolutionExtractor, GLPISyncService
from services.ticket_router import TicketRouter
from services.knowledge_pipeline import KnowledgePipeline
from services.analytics import TrendAnalyzer
from services.feedback import FeedbackLoop

# FSM Import
from fsm import initialize_fsm_for_user

# ==============================================================================
# CONFIGURATION
# ==============================================================================
load_dotenv(override=True)
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

app = Flask(__name__)
CORS(app, origins="*")

# Core Config
SERVICE_ACCOUNT_FILE = "client.json"
WATCH_FOLDER_ID = os.getenv("WATCH_FOLDER_ID")
MONGO_URI = os.getenv("MONGO_URI")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
GLPI_HOST = os.getenv("GLPI_HOST")
GLPI_APP_TOKEN = os.getenv("GLPI_APP_TOKEN")
GLPI_API_TOKEN = os.getenv("GLPI_API_TOKEN")
DEFAULT_SUPPORT_PERSONA = os.getenv("DEFAULT_SUPPORT_PERSONA", "ol_technical_and_diagnostics")
GLPI_SYNC_INTERVAL_SECONDS = int(os.getenv("GLPI_SYNC_INTERVAL_SECONDS", "1800"))
KNOWLEDGE_PIPELINE_INTERVAL_SECONDS = int(os.getenv("KNOWLEDGE_PIPELINE_INTERVAL_SECONDS", "60"))
ANALYTICS_REFRESH_INTERVAL_SECONDS = int(os.getenv("ANALYTICS_REFRESH_INTERVAL_SECONDS", "600"))
METRICS_REFRESH_INTERVAL_SECONDS = int(os.getenv("METRICS_REFRESH_INTERVAL_SECONDS", "900"))

# DB & Model Config
DB_NAME = "obvix_lake_db"
CHAT_HISTORY_COL = "chat_histories"
USER_PROFILES_COL = "user_profiles"
GLPI_RAW_TICKETS_COL = "glpi_tickets"
GLPI_RESOLUTIONS_COL = "glpi_resolutions"
GLPI_SYNC_STATE_COL = "glpi_sync_state"
KNOWLEDGE_QUEUE_COL = "knowledge_pipeline_queue"
KNOWLEDGE_ARTICLES_COL = "knowledge_articles"
ANALYTICS_CLUSTERS_COL = "analytics_clusters"
TICKET_ROUTING_AUDIT_COL = "ticket_routing_audit"
FEEDBACK_EVENTS_COL = "feedback_events"
SYSTEM_METRICS_COL = "system_metrics"
SUPPORT_ESCALATIONS_COL = "support_escalations"
PERSONA_COLLECTION_PREFIX = "persona_"
EMBEDDING_MODEL = "text-embedding-3-large"
CHAT_MODEL = "gpt-4o"
LLM_TEMP_LOW = 0.1

GLPI_ENABLED = all([GLPI_HOST, GLPI_APP_TOKEN, GLPI_API_TOKEN])

# RAG & Flow Config
MAX_HISTORY_MESSAGES_TO_RETRIEVE = 10

if not all([WATCH_FOLDER_ID, MONGO_URI, OPENAI_API_KEY]):
    raise SystemExit("❌ FATAL: Missing essential environment variables.")

# ==============================================================================
# CLIENTS
# ==============================================================================
try:
    creds = service_account.Credentials.from_service_account_file(
        SERVICE_ACCOUNT_FILE, scopes=["https://www.googleapis.com/auth/drive.readonly"]
    )
    drive_service = build("drive", "v3", credentials=creds, cache_discovery=False)
    logging.info("✅ Google Drive client initialized.")
except Exception as e:
    raise SystemExit(f"❌ FATAL: Failed to initialize Google Drive client: {e}")

try:
    mongo_client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
    db = mongo_client[DB_NAME]
    db[CHAT_HISTORY_COL].create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
    db[USER_PROFILES_COL].create_index([("user_id", ASCENDING)])
    logging.info("✅ MongoDB client connected.")
except errors.ConnectionFailure as e:
    raise SystemExit(f"❌ FATAL: MongoDB connection failed: {e}")

openai_client = OpenAI(api_key=OPENAI_API_KEY)
logging.info(f"✅ OpenAI client initialized with model: {CHAT_MODEL}")


def build_embeddings(texts: List[str]) -> List[List[float]]:
    if not texts:
        return []
    response = openai_client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [row.embedding for row in response.data]


def short_completion(system_prompt: str, user_prompt: str, max_tokens: int = 120) -> str:
    resp = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        temperature=LLM_TEMP_LOW,
        messages=[{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
        max_tokens=max_tokens,
    )
    return resp.choices[0].message.content.strip()

# ==============================================================================
# DRIVE HELPERS
# ==============================================================================
def fetch_plain_text(file_id: str, mime_type: str) -> str:
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
        return fh.getvalue().decode("utf-8", errors="ignore")
    except Exception as e:
        logging.error(f"Failed to fetch text for file {file_id}: {e}")
        return ""


def _parse_key_value_doc(text_content: str) -> Dict[str, Any]:
    profile_data = {}
    for line in text_content.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            profile_data[key.strip()] = value.strip()
    return profile_data


def upsert_persona_document(persona_name: str, file_id: str, file_name: str, text_content: str):
    collection_name = f"{PERSONA_COLLECTION_PREFIX}{persona_name}"
    persona_collection = db[collection_name]
    doc_name_clean = os.path.splitext(file_name)[0].lower().strip()

    if doc_name_clean == "profile":
        profile_data = _parse_key_value_doc(text_content)
        if profile_data:
            persona_collection.update_one(
                {"file_id": file_id},
                {"$set": {"doc_type": "profile", "content": profile_data}},
                upsert=True,
            )
    elif doc_name_clean == "common_phrases":
        persona_collection.update_one(
            {"file_id": file_id},
            {"$set": {"doc_type": "phrases", "content": text_content}},
            upsert=True,
        )
    else:
        chunks = [c for c in text_content.split("\n\n") if c.strip()]
        if not chunks:
            return
        embeddings = [
            data.embedding
            for data in openai_client.embeddings.create(input=chunks, model=EMBEDDING_MODEL).data
        ]
        operations = [
            UpdateOne(
                {"file_id": file_id, "chunk_index": i},
                {"$set": {"doc_type": "knowledge", "content": chunk, "embedding": embedding}},
                upsert=True,
            )
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings))
        ]
        if operations:
            persona_collection.bulk_write(operations)

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

            has_profile = any(f["name"].lower() == "profile.txt" for f in files)
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
            for persona_folder in persona_folders:
                persona_name = persona_folder["name"].lower().replace(" ", "_")
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
                    if file_id not in processed_files or processed_files.get(file_id) != modified_time:
                        logging.info(f"Processing '{file['name']}' for persona '{persona_name}'...")
                        text = fetch_plain_text(file_id, file["mimeType"])
                        if text:
                            upsert_persona_document(persona_name, file_id, file["name"], text)
                            processed_files[file_id] = modified_time
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
    db[CHAT_HISTORY_COL].insert_one(
        {"user_id": user_id, "role": role, "content": content, "timestamp": datetime.now()}
    )


def get_relevant_history(user_id: str, k: int) -> list:
    history_cursor = db[CHAT_HISTORY_COL].find({"user_id": user_id}).sort("timestamp", DESCENDING).limit(k)
    return [{"role": msg["role"], "content": msg["content"]} for msg in reversed(list(history_cursor))]

# ==============================================================================
# PERSONA / RAG
# ==============================================================================
def get_persona_context(persona_name: str, query: str, k: int = 4) -> tuple:
    collection_name = f"{PERSONA_COLLECTION_PREFIX}{persona_name}"
    persona_collection = db[collection_name]
    profile_doc = persona_collection.find_one({"doc_type": "profile"})
    model_settings = profile_doc["content"] if profile_doc else {}
    phrases_doc = persona_collection.find_one({"doc_type": "phrases"})
    common_phrases = phrases_doc["content"] if phrases_doc else ""
    logging.info(f"Loaded persona {persona_name} with settings: {model_settings} and common phrases.")

    query_embedding = openai_client.embeddings.create(input=[query], model=EMBEDDING_MODEL).data[0].embedding

    all_knowledge = list(persona_collection.find({"doc_type": "knowledge"}))
    if all_knowledge:
        for doc in all_knowledge:
            doc["similarity"] = float(np.dot(query_embedding, doc["embedding"]))
        all_knowledge.sort(key=lambda x: x["similarity"], reverse=True)
        rag_knowledge = "\n---\n".join([doc["content"] for doc in all_knowledge[:k]])
    else:
        rag_knowledge = "No specific background knowledge provided."

    return model_settings, common_phrases, rag_knowledge

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
    articles_collection=KNOWLEDGE_ARTICLES_COL,
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
if GLPI_ENABLED:
    glpi_client = GLPIClient(GLPI_HOST, GLPI_APP_TOKEN, GLPI_API_TOKEN)
    glpi_sync_service = GLPISyncService(
        db,
        glpi_client,
        resolution_extractor,
        resolution_handler=knowledge_pipeline.enqueue_resolution,
        state_collection=GLPI_SYNC_STATE_COL,
        raw_collection=GLPI_RAW_TICKETS_COL,
        resolution_collection=GLPI_RESOLUTIONS_COL,
    )
    logging.info("✅ GLPI integration enabled. Host: %s", GLPI_HOST)
else:
    glpi_client = None
    glpi_sync_service = None
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
EXTRACT_FIELDS = [
    "email", "name", "gender", "income_range", "salary", "city", "address_area",
    "phone", "company", "use_case", "product_interest", "needs", "wants",
    "pain_points", "budget", "plan_speed", "devices_count", "household_size",
    "timeline", "installation_time_preference", "preferred_contact_time",
    "current_provider", "tone_preference"
]

def extract_and_upsert_profile_fields(user_id: str, message: str, history: Optional[List[Dict[str, str]]] = None):
    context = ""
    if history:
        context = "\nRecent history:\n" + "\n".join([f"{m['role']}: {m['content']}" for m in history[-6:]])
    system = (
        "Extract structured CRM fields from the message and short history if available.\n"
        f"Only these keys: {EXTRACT_FIELDS}.\n"
        "Return a STRICT JSON object with any found keys. "
        "Normalize: email lowercased; budget as simple string (e.g., '1000-1500 INR'); "
        "income_range/salary as simple strings; plan_speed as plain number with 'Mbps' if present (e.g., '300 Mbps')."
    )
    result = _llm_json_call(system, f"Message:\n{message}\n{context}", {})
    if "email" not in result:
        m = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", message or "")
        if m:
            result["email"] = m.group(0).lower()
    if not result:
        return
    db[USER_PROFILES_COL].update_one({"user_id": user_id}, {"$set": result}, upsert=True)

# ==============================================================================
# TEXT GENERATORS
# ==============================================================================
def resolve_model_name(model_settings: Dict[str, Any], persona_name: str) -> str:
    name = (model_settings or {}).get("model_name")
    if name:
        return name
    slug = persona_name or ""
    if slug.startswith("ol_"):
        slug = slug[3:]
    slug = slug.replace("_", " ").strip()
    return slug.title() if slug else "Agent"

def build_user_memory_snippet(user_profile: Dict[str, Any]) -> str:
    keys_in_priority = [
        "name", "city", "address_area", "gender", "income_range", "salary", "budget",
        "product_interest", "plan_speed", "needs", "wants", "pain_points", "use_case",
        "current_provider", "devices_count", "household_size", "timeline",
        "installation_time_preference", "preferred_contact_time", "tone_preference"
    ]
    items = []
    for k in keys_in_priority:
        v = user_profile.get(k)
        if v is not None and v != "":
            items.append(f"{k}: {v}")
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
    resolution_note = router_payload.get("resolution_proposal")
    if resolution_note:
        snippets.insert(0, f"Proposed resolution: {resolution_note[:400]}")
    snippet_block = "\n".join(snippets) if snippets else "- No high-confidence knowledge snippets surfaced yet."
    return f"{header}\nSuggested references:\n{snippet_block}"


def construct_support_messages(
    model_settings,
    history,
    rag_knowledge,
    common_phrases,
    fsm_state,
    user_profile: Dict[str, Any],
    persona_name: str,
    router_payload: Optional[Dict[str, Any]] = None,
):
    phase_instructions = {
        "Phase0_Greeting": "Greet the user, state your persona explicitly, and ask what issue they are facing.",
        "Phase1_IssueIntake": "Capture clear problem details (device, location, impact, error codes). Ask one focused question if anything is missing.",
        "Phase2_Diagnostics": "Walk the user through diagnostic checks step-by-step. Reference prior info so you do not repeat questions.",
        "Phase3_SolutionProposal": "Present resolution steps using available knowledge. Cite the most relevant snippet in natural language.",
        "Phase4_Confirmation": "Confirm whether the solution worked. Offer a fallback or next diagnostic only if needed.",
        "Phase5_Closing": "Summarize what was done and set expectations for monitoring or follow-up.",
    }
    instruction = phase_instructions.get(fsm_state, "Stay helpful, concise, and grounded in factual knowledge.")
    memory = build_user_memory_snippet(user_profile)
    tone_pref = user_profile.get("tone_preference", "")
    tone_obs = (user_profile.get("tone_observed") or "neutral")
    agent_name = resolve_model_name(model_settings, persona_name)
    router_context = build_router_context(router_payload)

    system_prompt = f"""
You are "{agent_name}", {model_settings.get('model_identity', 'a senior support specialist')} for this persona.
Current FSM state: {fsm_state}
Objective: {instruction}

Constraints:
- Use only approved knowledge below plus router guidance.
- Never invent fixes; if unsure, say you will escalate.
- Tone: match preference ({tone_pref or 'none'}) else observed tone ({tone_obs}).
- When giving steps, number them and keep each step under 25 words.
- Use these approved phrases when natural: {common_phrases or 'n/a'}

User memory: {memory}
Router context:\n{router_context}

Knowledge base snippets:\n{rag_knowledge}
"""
    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history)
    return messages


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


def _format_transcript(history: List[Dict[str, str]], latest_user_message: str) -> str:
    turns = history[-20:]
    lines = [f"{turn.get('role', 'unknown')}: {turn.get('content', '')}" for turn in turns]
    if latest_user_message:
        lines.append(f"user: {latest_user_message}")
    return "\n".join(lines)


def record_escalation_case(
    user_id: str,
    persona_name: str,
    history: List[Dict[str, str]],
    user_message: str,
    router_payload: Optional[Dict[str, Any]],
):
    transcript = _format_transcript(history, user_message)
    classification = (router_payload or {}).get("classification", {})
    ticket_id = None
    if glpi_client:
        body = (
            f"Persona: {persona_name}\nUser ID: {user_id}\n"
            f"Router classification: {json.dumps(classification, indent=2)}\n\n"
            f"Conversation transcript (latest first):\n{transcript}"
        )
        payload = {
            "name": f"[Auto Escalation] {classification.get('issue_category', 'Support case').title()} - {user_id}",
            "content": body,
            "status": 1,  # new
            "type": 1,  # incident
            "urgency": _map_glpi_urgency(classification.get('urgency')),
            "impact": _map_glpi_impact(classification.get('impact_scope')),
            "requesttypes_id": 1,
        }
        try:
            resp = glpi_client.create_ticket(payload)
            ticket_id = resp.get("id") or resp.get("ticket_id")
            logging.info("Created GLPI ticket %s for user %s", ticket_id, user_id)
        except Exception as exc:
            logging.error("GLPI escalation ticket failed: %s", exc)

    doc = {
        "user_id": user_id,
        "persona": persona_name,
        "ticket_id": ticket_id,
        "router_classification": classification,
        "router_payload": router_payload,
        "transcript": transcript,
        "created_at": datetime.now(timezone.utc),
    }
    db[SUPPORT_ESCALATIONS_COL].insert_one(doc)
    db[USER_PROFILES_COL].update_one(
        {"user_id": user_id},
        {"$set": {"last_support_handoff": datetime.now(timezone.utc), "last_glpi_ticket_id": ticket_id}},
        upsert=True,
    )
    return ticket_id


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


FINAL_STATE_RESPONSES = {
    'FinalState_Resolved': "Glad we could get that sorted. If anything else breaks, just send another message here.",
    'FinalState_Escalated': "I've captured the diagnostics and looped in a human specialist. They'll reach out shortly.",
    'FinalState_FollowUp': "I'll monitor things on our side. If the issue returns, share any new symptoms and we'll dig deeper.",
}

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
    fsm = initialize_fsm_for_user(user_profile)

    if getattr(fsm, "state", None) in FINAL_STATE_RESPONSES:
        response_content = FINAL_STATE_RESPONSES.get(fsm.state, FINAL_STATE_RESPONSES['FinalState_FollowUp'])
        save_message_to_history(user_id, "assistant", response_content)
        return jsonify({"message": response_content, "fsm_state": fsm.state}), 200

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
        {"$inc": {"message_count": 1}, "$set": {"fsm_state": fsm.state}},
        upsert=True
    )

    try:
        model_settings, common_phrases, rag_knowledge = get_persona_context(persona_name, user_message or "Introduction")

        router_payload = None
        if ticket_router and user_message:
            router_payload = ticket_router.route_ticket(
                persona_name,
                user_message,
                ticket_id=f"{user_id}-{int(time.time())}",
                metadata={"persona": persona_name},
            )
            db[USER_PROFILES_COL].update_one(
                {"user_id": user_id},
                {"$set": {"last_router_decision": router_payload}},
                upsert=True
            )

        classification = (router_payload or {}).get("classification", {})
        needs_supervisor = bool(classification.get("needs_supervisor"))
        requires_human = bool(classification.get("requires_human"))

        if needs_supervisor or requires_human:
            fsm.escalate()
            ticket_id = record_escalation_case(user_id, persona_name, history, user_message, router_payload)
            response_content = FINAL_STATE_RESPONSES['FinalState_Escalated']
            if ticket_id:
                response_content += f" Reference ticket #{ticket_id}."
        elif router_payload and router_payload.get("decision") == "auto_resolved" and router_payload.get("resolution_proposal"):
            fsm.mark_resolved()
            response_content = "Here's what typically fixes this scenario:\n" + router_payload["resolution_proposal"]
        else:
            fsm.progress()
            llm_messages = construct_support_messages(
                model_settings,
                history,
                rag_knowledge,
                common_phrases,
                fsm.state,
                user_profile,
                persona_name,
                router_payload,
            )
            if user_message:
                llm_messages.append({"role": "user", "content": user_message})
            ai_response = openai_client.chat.completions.create(
                model=CHAT_MODEL, messages=llm_messages, temperature=0.25, max_tokens=220
            )
            response_content = ai_response.choices[0].message.content

        save_message_to_history(user_id, "assistant", response_content)
        db[USER_PROFILES_COL].update_one(
            {"user_id": user_id},
            {"$set": {"fsm_state": fsm.state}},
            upsert=True
        )
        payload = {"message": response_content, "fsm_state": fsm.state}
        if router_payload:
            payload["router"] = router_payload
        if needs_supervisor or requires_human:
            payload["glpi_ticket_id"] = ticket_id
        return jsonify(payload), 200

    except Exception as e:
        logging.error(f"Error in chat handler: {e}", exc_info=True)
        return jsonify({"error": "An internal error occurred."}), 500


if __name__ == "__main__":
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        start_background_threads()
    app.run(host="0.0.0.0", port=8001, debug=True)
