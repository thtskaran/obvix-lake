

# Usage Guide — Obvix Lake Conversational Orchestrator

This service orchestrates end-to-end support conversations with a single endpoint. Every turn now flows through the ticket router, hybrid RAG stack, and validation gates so the bot can work knowledge-grounded diagnostics and only escalate with the full trace when confidence stays low after several attempts—no finite-state machine required.

It continually enriches a lightweight CRM / ticket profile in MongoDB and uses that memory to personalize every reply.

---

## 1) Endpoint

**POST `/chat`**

**Request JSON**
```json
{
  "persona_name": "ol_residential_broadband",
  "user_id": "some-stable-id",
  "message": "free text user message"
}
````

**Response JSON**

```json
{
  "message": "assistant's reply text",
  "confidence": "HIGH",
  "escalation_deferred": false,
  "assist_attempts_with_kb": 1,
  "sources": [
    {"id": "kb_doc_001", "source": "ticket_12345", "preview": "Reboot firewall and reapply policy"}
  ],
  "glpi_ticket_id": "24857",            // present only when escalated
  "router": { ... },                      // ticket router payload when available (includes route_to_human)
  "ticket_forwarded": true,               // returned when the assistant routes the message directly into an open ticket
  "active_ticket": {                      // snapshot of the active ticket state (present when ticket_forwarded is true)
    "ticket_id": "24857",
    "status": "open",
    "last_forwarded_at": "2025-11-08T21:58:12.941Z",
    "forwarded_via_glpi": true
  },
  "ticket_section_closed": {              // emitted on the first message after a ticket is resolved
    "ticket_id": "24857",
    "closed_at": "2025-11-08T20:12:04.003Z",
    "notice": "Support ticket #24857 has been marked resolved. I'm ready to assist you directly again.",
    "resolution_summary": ["Replaced the faulty transceiver", "Validated signal levels post replacement"]
  }
}
```


When a conversation already has an open ticket, `/chat` stops invoking the LLM and instead forwards the user's message as a ticket follow-up. The response echoes an acknowledgement, sets `ticket_forwarded` to `true`, and includes the `active_ticket` snapshot so clients can surface ticket status. Once GLPI marks the ticket as resolved, the next `/chat` response carries `ticket_section_closed` with a human-readable notice and resolution metadata, signalling that the assistant is back in control until a new ticket is raised.
`confidence` reflects the hybrid retrieval + grounding gates (HIGH or LOW). `escalation_deferred` is `true` when the assistant is intentionally continuing troubleshooting before involving a human, and `assist_attempts_with_kb` tracks how many KB-backed replies have happened in the current window. `sources` enumerates every chunk cited in the response so downstream clients can build inline references. When the validation gates fail, `glpi_ticket_id` is returned after the deterministic handoff to GLPI.

**GET `/personas`**

Returns all persona IDs currently synced (no default persona). Use this to discover valid `persona_name` values before calling `/chat`.

```json
{
  "personas": ["ol_residential_broadband", "ol_enterprise_fiber"]
}
```

Notes:

* Always set `persona_name` to the exact Drive folder (e.g., `ol_residential_broadband`). There is no default persona.
* You **never** pass customer attributes via API. Flow selection uses what’s already stored for `user_id` in Mongo.
* All messages are appended to chat history and drive profile enrichment automatically.

### Additional Operational APIs

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/health` | GET | Full health probe covering the Flask app plus MongoDB, Google Drive, OpenAI, and GLPI. |
| `/tickets/route` | POST | Standalone ticket router + semantic lookup. Pass `{ "persona": "ol_support", "description": "..." }` to receive the classifier decision, urgency, and best matching knowledge snippets. |
| `/analytics/trends` | GET | Returns the most recent clustering + trend analysis computed from GLPI resolutions (emerging issues, top entities, cluster sizes). |
| `/feedback` | POST | Agent/customer feedback ingestion (`rating`, `comment`, optional `ticket_id`). Feeds the feedback loop + metrics. |
| `/metrics` | GET | Latest KPI snapshot (assistive rate, CSAT, knowledge growth ratio, avg resolution hours). |

All operational endpoints return JSON and reuse the same auth context as `/chat`.

---

## 2) Support Conversation Flow

Every `/chat` request is steered by three building blocks instead of an explicit state machine:

* **Ticket router signals** – classification (`issue_category`, `impact_scope`, `requires_human`, etc.) plus semantic similarity scores and a `route_to_human` flag.
* **Hybrid RAG retrieval + validation** – semantic + lexical retrieval, LLM relevance judge, and grounding score thresholds.
* **Outcome resolver** – keeps the assistant in the loop for at least `MIN_ASSIST_TURNS` (default 2) and up to `MAX_ASSIST_TURNS` (default 4) when knowledge is available; after that, or when coverage is missing, it escalates with the full diagnostic trace.

Persona prompts govern pacing and recap behavior, so the dialog feels stateful without keeping an explicit state machine in memory.

---

## 3) Ticket Router & Assistive Guidance

Before the assistant replies, the ticket text is scored by `services/ticket_router.TicketRouter`:

* Multi-dimensional classifier returns `issue_category`, `issue_type`, `urgency`, `impact_scope`, `sentiment`, `requires_human`, `needs_supervisor`, and `confidence`.
* Semantic similarity search (same persona partition) surfaces the top knowledge chunks plus any GLPI-derived snippets published by the knowledge pipeline.
* Decisions:
  * **Assistive mode** – default path when knowledge exists; router snippets are embedded into the LLM prompt so diagnostics reference the suggested articles.
  * **Human required** – if `needs_supervisor` is true or the router couldn’t surface a useful match, `route_to_human` is returned so the conversation can escalate after the assistant exhausts its configured attempts.

> Tune the conversational patience window with `MIN_ASSIST_TURNS` (default **2**) and `MAX_ASSIST_TURNS` (default **4**). The assistant will stay engaged for that many KB-backed replies before handing off. Attempts are tracked per `user_id` in Mongo under `assist_attempts_with_kb`.

You can also call the router directly through `POST /tickets/route` for standalone experiments.

---

## 4) Persona + Knowledge (RAG)

Each persona lives inside the Google Drive watch folder as a subfolder named `ol_<persona>`.
For example, `ol_residential_broadband` will be picked up automatically and ingested into MongoDB as the collection `persona_ol_residential_broadband`.

Inside every persona folder place a single **`profile.xml`** file that captures the persona’s voice, phrases, and optional seeded knowledge. The XML supports three top-level sections:

* `<profile>` — Core settings (`<modelName>`, `<modelIdentity>`, `<supportInstruction>`, `<toneGuidelines>`, etc.). Tag names are converted to snake_case keys automatically (e.g. `<supportInstruction>` → `support_instruction`).
* `<phrases>` — Optional list of `<phrase>` elements that become the “approved phrases” guidance in prompts.
* `<knowledge>` — Optional list of `<snippet>` (or any child tag) entries describing knowledge seeds. Provide child elements such as `<title>`, `<summary>`, `<body>`, `<steps>`, `<tip>`, and `<tags>`; the ingest loop composes these into embedded knowledge chunks for RAG.

Only content from `profile.xml` is required for manual personas now, keeping Drive folders clean. Legacy `profile.txt` / `common_phrases.txt` files are still ingested for backward compatibility, but new personas should use the XML format exclusively.

When you call `/chat`, pass the same folder name (e.g. `"ol_residential_broadband"`). There is no default persona; requests must always specify which persona to use. Sample persona XML definitions live under `examples/personas/` (`raspberry_pi_customer.xml`, `troubleshooting_agent.xml`, `airtel_support.xml`) to help you get started.

### Hybrid retrieval + validation gates

* Every turn now runs a **dual-channel retriever** (BM25 lexical + semantic embeddings) fused with weighted reciprocal rank (60% semantic / 40% lexical).
* Retrieved chunks are scored by three gates **before** an answer is attempted:
  1. Similarity thresholds (`avg ≥ 0.75`, `max ≥ 0.80` proceed; `< 0.60` escalates).
  2. A lightweight **LLM relevance judge** (default `RAG_JUDGE_MODEL=gpt-4o-mini`) that responds YES/NO.
  3. `context_precision` heuristic measuring term overlap ( <0.40 escalates, <0.60 replies with a LOW confidence preamble).
* When any gate fails the request is escalated deterministically with the failing metrics embedded into the GLPI ticket body.
* The generation prompt uses **Self-RAG reflection tokens**: the model must emit `[RELEVANT]/[IRRELEVANT]` before answering and `[GROUNDED]/[UNGROUNDED]` afterwards. `[IRRELEVANT]` or `[UNGROUNDED]` forces a human escalation.
* After generation, a groundedness heuristic computes a score; `GROUNDING_FAIL_THRESHOLD` (default `0.60`) triggers escalation, while scores between 0.60–0.85 mark the response as LOW confidence so the router can decide whether to defer escalation.
* Responses always cite chunks as `[kb_doc_###]`. The raw response payload exposes those chunks so clients can render inline references.

Environment knobs:

| Variable | Default | Purpose |
| --- | --- | --- |
| `RAG_JUDGE_MODEL` | `gpt-4o-mini` | LLM used for the YES/NO relevance judge. |
| `GROUNDING_FAIL_THRESHOLD` | `0.60` | Minimum acceptable grounding score before escalation. |
| `GROUNDING_CAUTION_THRESHOLD` | `0.85` | Below this score the user receives a caution banner. |

---

## 5) Tone Inference

The tone detector remains active (same schema as before) and writes `tone_observed` back to `user_profiles`. The prompt builder references this field plus any stored `tone_preference` to keep responses on-brand even across escalations.

---

## 6) What Data Is Stored (User Profile)

All under MongoDB collection `user_profiles`:

**Identity & Contact**

* `user_id` (key), `name`, `email`, `phone`, `company`, `job_title`, `department`, `industry`, `website`, `location`, `city`, `country`

**Needs & Context**

* `use_case`, `product_interest`, `needs`, `wants`, `pain_points`
* `current_solution`, `integration_requirements`, `success_metrics`, `decision_maker`, `stakeholders`
* `budget`, `timeline`, `preferred_contact_time`, `preferred_contact_channel`

**Persona & Ticketing Context**

* `last_router_decision` (stored JSON returned by `TicketRouter`)
* `last_support_handoff`, `last_support_attempt`
* `last_intent` (optional legacy field if you still persist external classifications)

**Tone & Intent**

* `tone_preference` (if user states it)
* `tone_observed` (inferred at runtime)
* `needs_supervisor`, `classifier_confidence`

**Operational**

* `message_count`
* `assist_attempts_with_kb`
* Optional fields you add for analytics (e.g., `intake_notes_captured`, `diagnostics_completed`)

> The schema above is just the default. Edits to `config/crm_profile_config.json` (or an alternate file referenced via `CRM_PROFILE_CONFIG_PATH`) automatically adjust which keys are captured and how they are normalized—no code changes required. Fields omitted from the config are neither requested from the LLM nor persisted to MongoDB. The application will fail to start if the referenced JSON file is missing or malformed, keeping configuration as the single source of truth.

> The system **auto-enriches** these fields every turn by extracting from the latest message + short history and by inferring tone/intent. When present, these values are fed back into prompts to personalize replies.

---

## 7) What the Assistant Uses From Memory

On every reply, prompts include a compact **User Memory** string built from the priority list defined in `config/crm_profile_config.json` (defaults include `name`, `company`, `job_title`, `industry`, `use_case`, `needs`, `pain_points`, `product_interest`, `current_solution`, `decision_maker`, `success_metrics`, `budget`, `timeline`, and contact preferences). If a value is present, it’s considered **authoritative** for wording and plan suggestions.
Tone is matched using `tone_preference` or `tone_observed`.

---

## 8) Minimal Usage Examples

### Multi-turn assist before escalation

```
POST /chat {"user_id":"cust_nina_01","persona_name":"ol_technical_and_diagnostics","message":"VPN fails with error 812 on Windows"}
→ TicketRouter finds a high-similarity GLPI snippet, decision=assistive, top_similarity=0.62, route_to_human=false
← Response (turn 1): Assistant shares the best-matching guidance in a natural tone.
→ Turn 2: user shares additional telemetry → assistant adjusts advice while `assist_attempts_with_kb` increments.
→ Turn 3: similarity stays low, attempts reach `MAX_ASSIST_TURNS` → next reply confirms a human escalation with the accumulated diagnostics attached.
```

### Guided diagnostics

```
Turn 1: user greets → assistant introduces the persona and sets expectations.
Turn 2: user explains "5G router keeps rebooting" → assistant gathers device and LED details.
Turn 3: user supplies photos → assistant provides numbered diagnostics grounded in the retrieved snippets.
Turn 4: once telemetry is sufficient, assistant shares the recommended fix citing the router context + Drive doc.
```

### Escalation

```
User: “Multiple branches offline; MPLS circuit down, carrier ticket #4390.”
→ Router classification: impact_scope=systemwide, needs_supervisor=true
→ System escalates immediately, creates a GLPI ticket, and the reply confirms human takeover.
```

---

## 9) Guardrails & Behavior Notes

* **No hallucinated offers**: replies are instructed to use **only** what’s in RAG for concrete plan/price/benefit claims. Otherwise, speak generally and confirm on the call.
* **No OTP/sensitive data** requests—ever.
* **Email capture** is regex-assisted if user embeds it in any message.
* **Type safety**: normalization rules declared in `crm_profile_config.json` (for example `email`, `phone`, `lowercase`, `number`) are applied automatically so downstream analytics receive consistent values.
* **Validated facts only**: the GLPI knowledge pipeline now extracts fact/source pairs and verifies that each source sentence exists in the original transcript. Items containing PII or missing citations are dropped before indexing.
* **PII scanner**: GLPI-derived articles are rejected if any chunk contains emails/phone numbers, preventing leakage into the vector store.
* **Observability**: every RAG turn logs retrieval, judge, and grounding metrics to `system_metrics`, enabling dashboards/alerts that mirror the spec.

---

## 10) Quick Field Reference

| Category      | Keys (non-exhaustive)                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `name, email, phone, company, job_title, department, industry, website, location, city, country`                                                                                             |
| Needs/Context | `use_case, product_interest, needs, wants, pain_points, current_solution, integration_requirements, success_metrics, decision_maker, stakeholders, budget, timeline, preferred_contact_time, preferred_contact_channel` |
| Persona/Ticket| `last_router_decision, last_support_handoff, last_support_attempt, last_intent (optional legacy)`                                                                                            |
| Tone/Intent   | `tone_preference, tone_observed, needs_supervisor, classifier_confidence`                                                                                                                   |
| Ops/Progress  | `message_count, assist_attempts_with_kb, intake_notes_captured, diagnostics_completed`                                                                                                      |

---

## 11) What to Log/Watch

* Router decision drift (e.g., spike in `requires_human` for easy categories).
* Repeated diagnostic loops without progress – usually indicates missing context fields or low-quality knowledge snippets.
* RAG coverage gaps – when replies fall back to generic guidance, add docs to the persona Drive or ensure GLPI pipelines are populating new fixes.

---

## 12) GLPI Ticket Sync & Resolution Extraction

Set the following env vars to activate the closed-loop GLPI integration:

```
GLPI_HOST=https://glpi.example.com
GLPI_APP_TOKEN=<application token>
GLPI_API_TOKEN=<user token>
DEFAULT_SUPPORT_PERSONA=ol_technical_and_diagnostics   # optional override
GLPI_SYNC_INTERVAL_SECONDS=1800                        # optional
KNOWLEDGE_AUTO_APPROVE=true                            # set false to require manual sign-off
```

A background worker authenticates with GLPI, fetches recently closed/solved tickets, stores raw payloads under `glpi_tickets`, and runs the resolution extractor. Each structured resolution lands in `glpi_resolutions` with embeddings, root cause, entities, and confidence. The `/health` endpoint includes GLPI status, so dashboards can alarm if sync fails.

Tickets that Obvix Lake escalates into GLPI are tracked by id; as soon as those GLPI tickets show a solved/closed status, the sync loop grabs them immediately (even if their closed dates fall outside the usual `GLPI_SYNC_INTERVAL_SECONDS` window) and pushes them through the same knowledge pipeline.
When a ticket originated from a specific persona (for example `ol_airtel`), the pipeline stores the resulting knowledge only under that persona’s Mongo collection, so other personas never see or reuse the fix by accident.

Additionally, whenever the router flags `needs_supervisor`/`requires_human`, `/chat` automatically creates a GLPI ticket containing the full conversation transcript plus router metadata and stores the generated ticket id in Mongo (`support_escalations`).

## 13) Knowledge Pipeline & Auto-KB Publishing

Every processed resolution is enqueued in `knowledge_pipeline_queue`. The pipeline:

1. Drafts an article (title, summary, steps, tags) via GPT.
2. Persists the draft plus transcript context on `knowledge_pipeline_queue` for approval (or immediate auto-approval when enabled).
3. Applies approvals automatically when `KNOWLEDGE_AUTO_APPROVE=true`; set it to `false` to hold drafts in `awaiting_approval` until a reviewer signs off.
4. Publishes approved content directly into the persona MongoDB collection (`persona_<slug>`) as a single `doc_type="knowledge_article"` document that contains:
   * Full FAQ-style metadata (summary, FAQ pairs, preventive guidance, transcript excerpts, embeddings).
   * A `chunks` array that stores the chunked passages + their embeddings so RAG can perform tag-first lookups before falling back to cosine similarity—all without generating extra per-chunk documents.

Manual reviews happen over the API: `GET /knowledge/queue?status=awaiting_approval` lists drafts, and `POST /knowledge/queue/<id>/approve` (body `{ "reviewer": "alice" }`) publishes the article, marks the knowledge chunks as `approved=manual`, and timestamps the approval.

This makes new fixes searchable immediately alongside Google Drive docs and powers `/tickets/route` assistive lookups. Configure `KNOWLEDGE_PIPELINE_INTERVAL_SECONDS` to tune how often drafts are processed.

## 14) Trend Analytics & Feedback Loop

* **Clustering:** Resolutions from the last 7 days are embedded and clustered (MiniBatchKMeans). `/analytics/trends` returns cluster ids, labels, sizes, top entities, and trend direction (`emerging/growing/stable/declining`). Refresh cadence is set by `ANALYTICS_REFRESH_INTERVAL_SECONDS`.
* **Feedback ingestion:** POST `/feedback` with `rating` (1–5), `comment`, optional `source` (`customer|agent`) and `ticket_id`. Everything is stored in `feedback_events`.
* **Metrics:** A periodic worker aggregates assistive rate, CSAT, knowledge growth ratio, and average GLPI resolution hours into `system_metrics`. `/metrics` always exposes the latest snapshot.

## 15) Operational Health Checks

`GET /health` fans out to MongoDB, Google Drive, OpenAI, and GLPI. Each entry surfaces `status` (`ok|error|disabled`) plus `error` text when needed. Poll this endpoint from uptime monitors to watch every dependency—including the new GLPI bridge.

---
**That’s it.** Between `/chat`, the GLPI-driven knowledge lake, `/tickets/route`, and the health/analytics/feedback APIs, Obvix Lake now runs the full closed-loop described in the v2 spec.
