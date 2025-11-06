

# Usage Guide — Obvix Lake Conversational Orchestrator

This service orchestrates customer sales & support conversations with a single endpoint and three intelligent flows:
- **Outbound (Lead / non-customer)**
- **Outbound (Existing customer / upsell)**
- **Inbound (Unknown / router for product vs. support)**

It continually enriches a lightweight CRM profile in MongoDB and uses that memory to personalize every reply.

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

## 2) Flow Selection (no API flags — DB-driven)

At the start of each turn, the app loads `user_profiles[user_id]`:

* **Outbound — Existing customer (`outbound_existing`)**
  Profile has `"is_customer": true`. We **upsell** only. No extra data asks. End with:
  `“Our team will contact you soon to finish the next steps.”`

* **Outbound — Lead (`outbound_lead`)**
  Profile exists with `"is_customer": false`. We **convert** to customer. Ask for missing details naturally. CTA is controlled by buying-intent gating (see §5).

* **Inbound (`inbound`)**
  **No profile** for `user_id`. Route with a low-temp classifier:
  `product_query` vs `support_ticket` (+ `needs_supervisor`).

The chosen flow is persisted as `last_flow`.

---

## 3) Conversation Phases (FSM)

The FSM drives tone and intent while your app decides *when* a CTA is appropriate.

States you will see in responses:

* `Phase1_RapportBuilding`
* `Phase2_NeedsDiscovery`
* `Phase3_ValueProposition`
* `Phase4_CTA` (CTA copy only when the app decides to go here)
* `Phase5_ObjectionHandling`
* `Support_Triage` (used in inbound support)
* Final states:

  * `FinalState_ClosedWon` (CTA accepted + email captured or acknowledged)
  * `FinalState_ClosedLost` (opt-out or conversation ended)
  * `FinalState_SupportEscalated` (handed to human)
  * `FinalState_SupportResolved` (self-serve solved)

> The app moves between phases using a small heuristic plus memory-aware prompts. **CTA entry is gated** by the buying-intent analyzer (see §5).

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

## 5) Low-Temp Orchestrations

### (a) Inbound intent router

Strict JSON:

```json
{
  "intent": "product_query | support_ticket | other",
  "needs_supervisor": true/false,
  "classifier_confidence": 0.0-1.0
}
```

Supervisor triggers (examples): area outages, billing/account changes, compliance/safety.

### (b) Buying-intent analyzer (CTA gating)

Strict JSON:

```json
{
  "confidence": 0.0-1.0,
  "velocity": "increasing | steady | decreasing",
  "cta_recommended": true/false
}
```

* Configured threshold: **`confidence >= 0.75`** to allow a CTA.
* Profile updates under `buying_intent` (last\_confidence, velocity, last\_updated).

### (c) Tone inference

Strict JSON:

```json
{ "tone_observed": "neutral|formal|casual|friendly|frustrated|assertive", "confidence": 0.0-1.0 }
```

Used to mirror tone when there’s no explicit `tone_preference`.

---

## 6) Call-To-Action (CTA) Lifecycle

* App enters `Phase4_CTA` **only** when buying-intent ≥ threshold.
* CTA is a single, strong line tailored to the user’s stored facts (city, speed, budget, etc.) and tone.
* **Post-CTA user reply** is classified: `accepted` or `objected`.

  * **accepted**:

    * If an email is present in the reply, store it and go to `FinalState_ClosedWon`.
    * If missing, ask once: “What’s the best email to reach you?”
  * **objected**: Move to `Phase5_ObjectionHandling`, then back to value.

---

## 7) Support Handling

* **Inbound support + needs\_supervisor = true** → Immediate handoff: `FinalState_SupportEscalated`.
  The bot replies once to confirm escalation; humans continue.
* **Inbound support (self-serve)** → Up to **4 concise steps** leveraging RAG.
  No OTPs or sensitive info requests. If the user confirms success, set `FinalState_SupportResolved`.

---

## 8) Outbound Flows

### (a) Outbound — Existing customer (upsell)

* Skips data collection (we already have their persona).
* Recommends an upgrade (e.g., `Broadband → Broadband+TV`, or speed bump) tied to **their** household size, devices count, city, and budget.
* Always ends with: **“Our team will contact you soon to finish the next steps.”**

### (b) Outbound — Lead (non-customer)

* Conversationally collects missing fields (see §9).
* Renders value propositions grounded in RAG + collected constraints.
* Triggers CTA only when the buying-intent gate allows it.

---

## 9) What Data Is Stored (User Profile)

All under MongoDB collection `user_profiles`:

**Identity & Contact**

* `user_id` (key), `name`, `email`, `phone`, `gender`, `city`, `address_area`, `company`

**Needs & Context**

* `use_case`, `product_interest`, `needs`, `wants`, `pain_points`
* `budget` (also derived `budget_inr_min`, `budget_inr_max` when detectable)
* `plan_speed` (and `plan_speed_mbps`), `timeline`, `installation_time_preference`, `preferred_contact_time`
* `current_provider`, `devices_count`, `household_size`

**Persona & Flow**

* `is_customer` (true → outbound\_existing; false → outbound\_lead)
* `lead_status` (`lead|customer|unknown`)
* `last_flow` (`outbound_existing|outbound_lead|inbound`)
* `last_intent` (`product_query|support_ticket|other`)

**Tone & Intent**

* `tone_preference` (if user states it)
* `tone_observed` (inferred at runtime)
* `buying_intent` (object: `last_confidence`, `velocity`, `last_updated`)
* `needs_supervisor`, `classifier_confidence`

**Operational**

* `message_count`, `cta_objection_count`, `cta_just_performed`, `fsm_state`
* `last_support_handoff`, `last_support_attempt`

> The system **auto-enriches** these fields every turn by extracting from the latest message + short history and by inferring tone/intent. When present, these values are fed back into prompts to personalize replies.

---

## 10) What the Assistant Uses From Memory

On every reply, prompts include a compact **User Memory** string built from prioritized keys:

* `name, city, address_area, gender, income_range/salary, budget, product_interest, plan_speed, needs, wants, pain_points, use_case, current_provider, devices_count, household_size, timeline, installation_time_preference, preferred_contact_time, tone_preference`

If a value is present, it’s considered **authoritative** for wording and plan suggestions.
Tone is matched using `tone_preference` or `tone_observed`.

---

## 11) Minimal Usage Examples

### Outbound — Lead (conversion)

```
POST /chat {user_id:"lead_alex_001", persona_name:"ol_residential_broadband", message:"Hi there!"}
→ Builds rapport, asks targeted questions using stored city/speed/budget if present.

... (few turns; analyzer reaches confidence >= 0.75) ...

→ Message returns with Phase4_CTA and a single confident CTA line.
User: “Yes, tomorrow 2 PM works. alex@example.com”
→ State: FinalState_ClosedWon, email captured.
```

### Outbound — Existing (upsell)

```
POST /chat {user_id:"cust_ravi_001", persona_name:"ol_residential_broadband", message:"I already have a 100 Mbps plan"}
→ Suggests upgrade tied to household/devices/budget; ends with:
   “Our team will contact you soon to finish the next steps.”
```

### Inbound — Support (escalation)

```
User: “LOS light is red in Whitefield; internet down since morning.”
→ intent=support_ticket, needs_supervisor=true
→ State: FinalState_SupportEscalated and reply confirming handoff.
```

### Inbound — Product (CTA when warranted)

```
User: “300 Mbps in Bengaluru? Need strong uploads.”
→ product flow; gives value-prop grounded in RAG; if confidence high → CTA.
```

---

## 12) Guardrails & Behavior Notes

* **No hallucinated offers**: replies are instructed to use **only** what’s in RAG for concrete plan/price/benefit claims. Otherwise, speak generally and confirm on the call.
* **No OTP/sensitive data** requests—ever.
* **Email capture** is regex-assisted if user embeds it in any message.
* **Type safety**: numeric fields (e.g., `devices_count`, `household_size`, `plan_speed_mbps`) are normalized when detectable, enabling downstream analytics.

---

## 13) Quick Field Reference

| Category      | Keys (non-exhaustive)                                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity      | `name, email, phone, gender, city, address_area, company`                                                                                                                                    |
| Needs/Context | `use_case, product_interest, needs, wants, pain_points, budget, plan_speed, timeline, installation_time_preference, preferred_contact_time, current_provider, devices_count, household_size` |
| Persona/Flow  | `is_customer, lead_status, last_flow, last_intent`                                                                                                                                           |
| Tone/Intent   | `tone_preference, tone_observed, buying_intent{last_confidence,velocity,last_updated}, needs_supervisor, classifier_confidence`                                                              |
| Ops/States    | `message_count, cta_objection_count, cta_just_performed, fsm_state, last_support_handoff, last_support_attempt`                                                                              |

---

## 14) What to Log/Watch

* Unexpected transitions to `Phase4_CTA` (should always be paired with `confidence >= 0.75`).
* Profile type drift (e.g., numbers becoming strings) if custom extractors are modified.
* Any RAG gaps that cause generic wording—add docs to persona Drive to improve specificity.

---

## 15) GLPI Ticket Sync & Resolution Extraction

Set the following env vars to activate the closed-loop GLPI integration:

```
GLPI_HOST=https://glpi.example.com
GLPI_APP_TOKEN=<application token>
GLPI_API_TOKEN=<user token>
DEFAULT_SUPPORT_PERSONA=ol_technical_and_diagnostics   # optional override
GLPI_SYNC_INTERVAL_SECONDS=1800                        # optional
```

A background worker authenticates with GLPI, fetches recently closed/solved tickets, stores raw payloads under `glpi_tickets`, and runs the resolution extractor. Each structured resolution lands in `glpi_resolutions` with embeddings, root cause, entities, and confidence. The `/health` endpoint includes GLPI status, so dashboards can alarm if sync fails.

## 16) Knowledge Pipeline & Auto-KB Publishing

Every processed resolution is enqueued in `knowledge_pipeline_queue`. The pipeline:

1. Drafts an article (title, summary, steps, tags) via GPT.
2. Simulates lead/SMe approvals (timestamps recorded) and deduplicates against existing KB embeddings.
3. Publishes approved content into:
   * `knowledge_articles` (audit record, article embedding).
   * Persona MongoDB collections (`persona_<slug>`) as `doc_type="knowledge"` chunks tagged with `source="glpi_pipeline"`.

This makes new fixes searchable immediately alongside Google Drive docs and powers `/tickets/route` auto-resolutions. Configure `KNOWLEDGE_PIPELINE_INTERVAL_SECONDS` to tune how often drafts are processed.

## 17) Trend Analytics & Feedback Loop

* **Clustering:** Resolutions from the last 7 days are embedded and clustered (MiniBatchKMeans). `/analytics/trends` returns cluster ids, labels, sizes, top entities, and trend direction (`emerging/growing/stable/declining`). Refresh cadence is set by `ANALYTICS_REFRESH_INTERVAL_SECONDS`.
* **Feedback ingestion:** POST `/feedback` with `rating` (1–5), `comment`, optional `source` (`customer|agent`) and `ticket_id`. Everything is stored in `feedback_events`.
* **Metrics:** A periodic worker aggregates auto-resolution rate, CSAT, knowledge growth ratio, and average GLPI resolution hours into `system_metrics`. `/metrics` always exposes the latest snapshot.

## 18) Operational Health Checks

`GET /health` fans out to MongoDB, Google Drive, OpenAI, and GLPI. Each entry surfaces `status` (`ok|error|disabled`) plus `error` text when needed. Poll this endpoint from uptime monitors to watch every dependency—including the new GLPI bridge.

---
**That’s it.** Between `/chat`, the GLPI-driven knowledge lake, `/tickets/route`, and the health/analytics/feedback APIs, Obvix Lake now runs the full closed-loop described in the v2 spec.
