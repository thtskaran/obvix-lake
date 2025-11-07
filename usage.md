

# Usage Guide — Obvix Lake Conversational Orchestrator

This service orchestrates end-to-end support conversations with a single endpoint. Every turn runs through the ticket router, support FSM, and RAG stack so the bot can either auto-resolve by citing knowledge or escalate with the full diagnostic trace.

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
  "fsm_state": "Phase2_NeedsDiscovery",
  "flow": "inbound | outbound_lead | outbound_existing"   // present when resolved
}
```

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
| `/metrics` | GET | Latest KPI snapshot (auto-resolution rate, CSAT, knowledge growth ratio, avg resolution hours). |

All operational endpoints return JSON and reuse the same auth context as `/chat`.

---

## 2) Support Conversation Lifecycle (FSM)

Every `/chat` request flows through a single support-focused FSM. The states you will see in responses are:

* `Phase0_Greeting` – welcome message plus disclosure of the persona.
* `Phase1_IssueIntake` – gather problem details (device, location, impact, error codes).
* `Phase2_Diagnostics` – step-by-step checks to narrow the root cause.
* `Phase3_SolutionProposal` – share the fix grounded in Drive/GLPI knowledge.
* `Phase4_Confirmation` – verify that the solution worked or ask for one missing signal.
* `Phase5_Closing` – summarize actions and set monitoring expectations.
* Final states: `FinalState_Resolved`, `FinalState_Escalated`, `FinalState_FollowUp`.

The FSM advances automatically based on heuristics (message count, stored context) or jumps straight to a final state when the router decides that a human must take over. The assistant never shifts into a sales/CTA mode anymore.

---

## 3) Ticket Router & Auto-Resolution

Before the FSM speaks, the ticket text is scored by `services/ticket_router.TicketRouter`:

* Multi-dimensional classifier returns `issue_category`, `issue_type`, `urgency`, `impact_scope`, `sentiment`, `requires_human`, `needs_supervisor`, and `confidence`.
* Semantic similarity search (same persona partition) surfaces the top knowledge chunks plus any GLPI-derived snippets published by the knowledge pipeline.
* Decisions:
  * **Auto-resolved** – if similarity ≥ threshold and `requires_human` is false, the assistant replies directly with the matching fix.
  * **Human required** – if `needs_supervisor` or `requires_human` is true, the FSM enters `FinalState_Escalated` and the reply confirms the handoff.
  * **Assistive mode** – otherwise the FSM continues and the router context is embedded into the LLM prompt so diagnostics reference the suggested articles.

You can also call the router directly through `POST /tickets/route` for standalone experiments.

---

## 4) Persona + Knowledge (RAG)

Each persona lives inside the Google Drive watch folder as a subfolder named `ol_<persona>`.
For example, `ol_residential_broadband` will be picked up automatically and ingested into MongoDB as the collection `persona_ol_residential_broadband`.

Inside every persona folder place plain-text docs:

* `profile.txt` → **model settings** (name, role, voice, guardrails)
* `common_phrases.txt` → **stylistic snippets** to weave into answers
* Any other `.txt` file → **knowledge chunks** (ingested with embeddings)

When you call `/chat`, pass the same folder name (e.g. `"ol_residential_broadband"`). There is no default persona; requests must always specify which persona to use.

---

## 5) Tone Inference

The tone detector remains active (same schema as before) and writes `tone_observed` back to `user_profiles`. The FSM references this field plus any stored `tone_preference` to keep responses on-brand even across escalations.

---

## 6) What Data Is Stored (User Profile)

All under MongoDB collection `user_profiles`:

**Identity & Contact**

* `user_id` (key), `name`, `email`, `phone`, `gender`, `city`, `address_area`, `company`

**Needs & Context**

* `use_case`, `product_interest`, `needs`, `wants`, `pain_points`
* `budget` (also derived `budget_inr_min`, `budget_inr_max` when detectable)
* `plan_speed` (and `plan_speed_mbps`), `timeline`, `installation_time_preference`, `preferred_contact_time`
* `current_provider`, `devices_count`, `household_size`

**Persona & Ticketing Context**

* `last_router_decision` (stored JSON returned by `TicketRouter`)
* `last_support_handoff`, `last_support_attempt`
* `last_intent` (optional legacy field if you still persist external classifications)

**Tone & Intent**

* `tone_preference` (if user states it)
* `tone_observed` (inferred at runtime)
* `needs_supervisor`, `classifier_confidence`

**Operational**

* `message_count`, `fsm_state`
* Optional fields you add for analytics (e.g., `intake_notes_captured`, `diagnostics_completed`)

> The system **auto-enriches** these fields every turn by extracting from the latest message + short history and by inferring tone/intent. When present, these values are fed back into prompts to personalize replies.

---

## 7) What the Assistant Uses From Memory

On every reply, prompts include a compact **User Memory** string built from prioritized keys:

* `name, city, address_area, gender, income_range/salary, budget, product_interest, plan_speed, needs, wants, pain_points, use_case, current_provider, devices_count, household_size, timeline, installation_time_preference, preferred_contact_time, tone_preference`

If a value is present, it’s considered **authoritative** for wording and plan suggestions.
Tone is matched using `tone_preference` or `tone_observed`.

---

## 8) Minimal Usage Examples

### Auto-resolve via router

```
POST /chat {"user_id":"cust_nina_01","persona_name":"ol_technical_and_diagnostics","message":"VPN fails with error 812 on Windows"}
→ TicketRouter finds a high-similarity GLPI snippet, decision=auto_resolved
← Response: "Here's what typically fixes this scenario" + remediation steps, FSM jumps to FinalState_Resolved.
```

### Guided diagnostics

```
Turn 1: user greets → FSM in Phase0_Greeting.
Turn 2: user explains "5G router keeps rebooting" → FSM moves to Phase1_IssueIntake asking for model/LED state.
Turn 3: user supplies photos → FSM moves to Phase2_Diagnostics, provides numbered checks.
Turn 4: once telemetry sufficient, FSM transitions to Phase3_SolutionProposal and cites the router context + Drive doc.
```

### Escalation

```
User: “Multiple branches offline; MPLS circuit down, carrier ticket #4390.”
→ Router classification: impact_scope=systemwide, needs_supervisor=true
→ FSM moves straight to FinalState_Escalated and reply confirms human takeover.
```

---

## 9) Guardrails & Behavior Notes

* **No hallucinated offers**: replies are instructed to use **only** what’s in RAG for concrete plan/price/benefit claims. Otherwise, speak generally and confirm on the call.
* **No OTP/sensitive data** requests—ever.
* **Email capture** is regex-assisted if user embeds it in any message.
* **Type safety**: numeric fields (e.g., `devices_count`, `household_size`, `plan_speed_mbps`) are normalized when detectable, enabling downstream analytics.

---

## 10) Quick Field Reference

| Category      | Keys (non-exhaustive)                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `name, email, phone, gender, city, address_area, company`                                                                                                                                    |
| Needs/Context | `use_case, product_interest, needs, wants, pain_points, budget, plan_speed, timeline, installation_time_preference, preferred_contact_time, current_provider, devices_count, household_size` |
| Persona/Ticket| `last_router_decision, last_support_handoff, last_support_attempt, last_intent (optional legacy)`                                                                                            |
| Tone/Intent   | `tone_preference, tone_observed, needs_supervisor, classifier_confidence`                                                                                                                   |
| Ops/States    | `message_count, fsm_state, intake_notes_captured, diagnostics_completed`                                                                                                                    |

---

## 11) What to Log/Watch

* Router decision drift (e.g., spike in `requires_human` for easy categories).
* FSM stalls (stuck in `Phase1_IssueIntake` for many turns) – usually indicates missing context fields.
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
2. Stores the final chunks directly inside the persona’s MongoDB collection (`doc_type="knowledge"`) with two extra fields: `auto_generated=true` and `approved` (`auto` vs `manual`).
3. Applies approvals automatically when `KNOWLEDGE_AUTO_APPROVE=true`; set it to `false` to hold drafts in `awaiting_approval` until a reviewer signs off.
4. Publishes approved content into:
   * `knowledge_articles` (audit record, article embedding).
   * Persona MongoDB collections (`persona_<slug>`) as `doc_type="knowledge"` chunks tagged with `source="glpi_pipeline"`.

Manual reviews happen over the API: `GET /knowledge/queue?status=awaiting_approval` lists drafts, and `POST /knowledge/queue/<id>/approve` (body `{ "reviewer": "alice" }`) publishes the article, marks the knowledge chunks as `approved=manual`, and timestamps the approval.

This makes new fixes searchable immediately alongside Google Drive docs and powers `/tickets/route` auto-resolutions. Configure `KNOWLEDGE_PIPELINE_INTERVAL_SECONDS` to tune how often drafts are processed.

## 14) Trend Analytics & Feedback Loop

* **Clustering:** Resolutions from the last 7 days are embedded and clustered (MiniBatchKMeans). `/analytics/trends` returns cluster ids, labels, sizes, top entities, and trend direction (`emerging/growing/stable/declining`). Refresh cadence is set by `ANALYTICS_REFRESH_INTERVAL_SECONDS`.
* **Feedback ingestion:** POST `/feedback` with `rating` (1–5), `comment`, optional `source` (`customer|agent`) and `ticket_id`. Everything is stored in `feedback_events`.
* **Metrics:** A periodic worker aggregates auto-resolution rate, CSAT, knowledge growth ratio, and average GLPI resolution hours into `system_metrics`. `/metrics` always exposes the latest snapshot.

## 15) Operational Health Checks

`GET /health` fans out to MongoDB, Google Drive, OpenAI, and GLPI. Each entry surfaces `status` (`ok|error|disabled`) plus `error` text when needed. Poll this endpoint from uptime monitors to watch every dependency—including the new GLPI bridge.

---
**That’s it.** Between `/chat`, the GLPI-driven knowledge lake, `/tickets/route`, and the health/analytics/feedback APIs, Obvix Lake now runs the full closed-loop described in the v2 spec.
