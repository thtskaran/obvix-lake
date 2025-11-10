# Obvix Lake

<div align="center">

**AI-Powered Support Orchestration Platform with Hybrid RAG & GLPI Integration**

[![Flask](https://img.shields.io/badge/Flask-3.0+-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0+-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?logo=openai&logoColor=white)](https://openai.com/)

*Intelligent conversational AI that learns from GLPI tickets, validates responses with hybrid RAG, and escalates only when confidence is low.*

[Features](#-features) • [Architecture](#-architecture) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [License](#-license)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Key Features](#-features)
- [Architecture](#-architecture)
- [Technology Stack](#-technology-stack)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [API Reference](#-api-reference)
- [Frontend Console](#-frontend-console)
- [Knowledge Management](#-knowledge-management)
- [GLPI Integration](#-glpi-integration)
- [Advanced Features](#-advanced-features)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Obvix Lake** is an enterprise-grade conversational AI orchestration platform that transforms customer support operations through intelligent automation, continuous learning, and human-in-the-loop workflows.

### What Makes Obvix Lake Different?

🔄 **Closed-Loop Learning**  
Automatically extracts knowledge from resolved GLPI tickets and enriches the knowledge base without manual curation.

🎯 **Hybrid RAG Pipeline**  
Combines semantic embeddings (60%) and BM25 lexical search (40%) with multi-stage validation gates to ensure grounded, accurate responses.

🤖 **Intelligent Escalation**  
Uses ticket routing, confidence scoring, and grounding validation to decide when to assist vs. when to escalate to human agents.

🧩 **Multi-Persona Support**  
Deploy specialized AI agents for different product lines or support tiers with isolated knowledge bases.

📊 **Real-Time Analytics**  
Cluster emerging issues, track CSAT, monitor assistive rates, and visualize knowledge growth with built-in trend analysis.

---

## ✨ Features

### Core Capabilities

- **Conversational AI Orchestration**
  - Stateless conversation management with full context retrieval
  - Multi-turn dialogue with memory and user profile enrichment
  - Tone inference and adaptive response styling
  - Self-RAG reflection tokens for quality control

- **Hybrid RAG System**
  - Dual-channel retrieval (semantic + lexical)
  - LLM-based relevance judging
  - Grounding score validation
  - Citation tracking and source attribution

- **GLPI Integration**
  - Bidirectional ticket synchronization
  - Automatic knowledge extraction from closed tickets
  - Smart escalation with full diagnostic context
  - Real-time ticket status monitoring

- **Knowledge Pipeline**
  - Auto-drafting of KB articles from resolutions
  - Manual review queue with approval workflows
  - PII detection and redaction
  - Fact verification against source transcripts

- **Advanced Document Processing**
  - **Docling** integration for PDFs, DOCX, DOC
  - OCR support for scanned documents
  - Structure preservation (headings, tables, lists)
  - Semantic chunking with context awareness
  - Markdown export with formatting

- **Analytics & Insights**
  - Issue clustering and trend detection
  - Emerging problem identification
  - CSAT tracking and feedback loops
  - Knowledge coverage metrics

### Frontend Console

- **Modern React Dashboard**
  - Real-time metrics visualization
  - Interactive chat interface with XState FSM
  - Knowledge base explorer
  - Review queue management
  - Ticket status tracking
  - Trend analytics with clustering

---

## 🏗 Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + TypeScript)            │
│  • Dashboard • Chat Interface • KB Explorer • Analytics     │
└────────────────────┬────────────────────────────────────────┘
                     │ REST API
┌────────────────────▼────────────────────────────────────────┐
│                   Backend (Flask + Python)                   │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Ticket    │  │  Hybrid RAG  │  │  Knowledge   │       │
│  │   Router    │  │   Pipeline   │  │   Pipeline   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
│                                                               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │    CRM      │  │   Feedback   │  │    Trend     │       │
│  │ Enrichment  │  │     Loop     │  │   Analyzer   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└────────────────────┬───────────────┬────────────────────────┘
                     │               │
        ┌────────────▼──┐       ┌───▼──────────┐
        │   MongoDB     │       │  Google Drive │
        │  (Vector DB)  │       │  (Personas)   │
        └───────────────┘       └───────────────┘
                     │
        ┌────────────▼──────────────┐
        │   External Integrations   │
        │  • OpenAI • GLPI • Docling│
        └───────────────────────────┘
```

### Data Flow

1. **User Query** → Chat endpoint with persona context
2. **Profile Enrichment** → Extract CRM fields from conversation
3. **Ticket Routing** → Classify issue, assess urgency, retrieve candidates
4. **RAG Retrieval** → Hybrid search with validation gates
5. **Response Generation** → Self-RAG with grounding checks
6. **Escalation Logic** → Create GLPI ticket if confidence < threshold
7. **Knowledge Loop** → Extract resolutions → Draft articles → Enrich KB

---

## 🛠 Technology Stack

### Backend
- **Framework:** Flask 3.0+ (Python 3.10+)
- **Database:** MongoDB 7.0+ (with vector search)
- **AI/ML:** OpenAI GPT-4/GPT-4o-mini, text-embedding-3-large
- **Document Processing:** Docling (PDF/DOCX with OCR)
- **NLP:** scikit-learn (BM25, clustering), NumPy
- **Integrations:** Google Drive API, GLPI REST API

### Frontend
- **Framework:** React 18.3+ with TypeScript 5.5+
- **Build Tool:** Vite 5.4+
- **Styling:** Tailwind CSS 3.4+
- **State Management:** Zustand, XState (FSM)
- **UI Components:** Lucide React, Framer Motion
- **Routing:** React Router DOM 6.28+

### Infrastructure
- **Authentication:** Google OAuth 2.0 (service accounts)
- **Background Jobs:** Threading (sync workers)
- **CORS:** Flask-CORS
- **Environment:** python-dotenv

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.10+** and pip
- **Node.js 18+** and npm/yarn
- **MongoDB 7.0+** (local or Atlas)
- **Google Cloud Service Account** with Drive API access
- **OpenAI API Key**
- **(Optional)** GLPI instance with REST API enabled

### Backend Setup

1. **Clone the repository**
   ```bash
   cd obvix-lake/backend
   ```

2. **Create virtual environment**
   ```bash
   python3 -m venv myenv
   source myenv/bin/activate  # On Windows: myenv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**
   ```bash
   cp .env.example .env  # Create from template
   nano .env             # Edit with your credentials
   ```

   **Required variables:**
   ```bash
   # MongoDB
   MONGO_URI=mongodb://localhost:27017/
   MONGO_DB_NAME=obvix_lake
   
   # OpenAI
   OPENAI_API_KEY=sk-...
   CHAT_MODEL=gpt-4o-mini
   EMBEDDING_MODEL=text-embedding-3-large
   
   # Google Drive
   GOOGLE_SERVICE_ACCOUNT_FILE=./client.json
   WATCH_FOLDER_ID=your-drive-folder-id
   
   # (Optional) GLPI
   GLPI_HOST=https://glpi.example.com
   GLPI_APP_TOKEN=...
   GLPI_API_TOKEN=...
   ```

5. **Add Google credentials**
   - Place your `client.json` service account key in `backend/`

6. **Run the backend**
   ```bash
   python app.py
   ```
   Server starts at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend**
   ```bash
   cd ../frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   nano .env
   ```
   
   ```bash
   VITE_API_URL=http://localhost:5000
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```
   App opens at `http://localhost:5173`

---

## ⚙️ Configuration

### Environment Variables (Backend)

#### Core Settings
| Variable | Default | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `INFO` | Logging level (DEBUG, INFO, WARNING, ERROR) |
| `MONGO_URI` | `mongodb://localhost:27017/` | MongoDB connection string |
| `MONGO_DB_NAME` | `obvix_lake` | Database name |

#### AI Models
| Variable | Default | Description |
|----------|---------|-------------|
| `CHAT_MODEL` | `gpt-4o-mini` | OpenAI chat model |
| `EMBEDDING_MODEL` | `text-embedding-3-large` | Embedding model |
| `RAG_JUDGE_MODEL` | `gpt-4o-mini` | Relevance judge model |
| `LLM_TEMP_LOW` | `0.2` | Temperature for structured outputs |

#### RAG Pipeline
| Variable | Default | Description |
|----------|---------|-------------|
| `RAG_TOP_K` | `5` | Top K chunks to retrieve |
| `RAG_MAX_CANDIDATES` | `400` | Max candidates before fusion |
| `RAG_BM25_WEIGHT` | `0.40` | Lexical search weight |
| `RAG_SEMANTIC_WEIGHT` | `0.60` | Semantic search weight |

#### Docling (Document Processing)
| Variable | Default | Description |
|----------|---------|-------------|
| `DOCLING_MAX_CHUNK_TOKENS` | `512` | Max tokens per chunk |
| `DOCLING_PRESERVE_TABLES` | `true` | Keep tables intact |
| `DOCLING_PRESERVE_FORMATTING` | `true` | Preserve formatting |

#### GLPI Integration
| Variable | Default | Description |
|----------|---------|-------------|
| `GLPI_HOST` | — | GLPI server URL |
| `GLPI_APP_TOKEN` | — | Application token |
| `GLPI_API_TOKEN` | — | User API token |
| `GLPI_SYNC_INTERVAL_SECONDS` | `1800` | Sync frequency (30 min) |

#### Knowledge Pipeline
| Variable | Default | Description |
|----------|---------|-------------|
| `KNOWLEDGE_AUTO_APPROVE` | `true` | Auto-publish KB articles |
| `KNOWLEDGE_PIPELINE_INTERVAL_SECONDS` | `60` | Processing interval |

#### Assistive Behavior
| Variable | Default | Description |
|----------|---------|-------------|
| `MIN_ASSIST_TURNS` | `2` | Min attempts before escalation |
| `MAX_ASSIST_TURNS` | `4` | Max attempts before forcing escalation |

### Persona Configuration

Personas are defined in Google Drive folders named `ol_<persona_name>` (e.g., `ol_technical_support`).

**Required file:** `profile.xml`

```xml
<persona name="Technical Support Agent">
  <profile>
    <modelName>TechBot</modelName>
    <modelIdentity>senior support specialist</modelIdentity>
    <supportInstruction>
      Diagnose technical issues using approved knowledge. 
      Escalate only when knowledge is insufficient.
    </supportInstruction>
    <toneGuidelines>
      Professional but friendly. Use numbered steps for troubleshooting.
    </toneGuidelines>
  </profile>
  
  <phrases>
    <phrase>Let me help you troubleshoot that.</phrase>
    <phrase>I've found a solution that might work for your case.</phrase>
  </phrases>
  
  <knowledge>
    <snippet>
      <title>WiFi Connectivity Issues</title>
      <summary>Steps to diagnose WiFi problems</summary>
      <body>
        1. Check router LED status
        2. Restart router by unplugging for 30 seconds
        3. Verify SSID visibility
      </body>
      <tags>
        <tag>wifi</tag>
        <tag>connectivity</tag>
        <tag>networking</tag>
      </tags>
    </snippet>
  </knowledge>
</persona>
```

### CRM Profile Configuration

Edit `backend/config/crm_profile_config.json` to customize captured fields:

```json
{
  "fields": [
    {"name": "name", "type": "string"},
    {"name": "email", "type": "email"},
    {"name": "company", "type": "string"},
    {"name": "use_case", "type": "string"},
    {"name": "budget", "type": "number"}
  ],
  "memory_priority": ["name", "company", "use_case"],
  "normalization_rules": {
    "email": "lowercase",
    "phone": "digits_only"
  }
}
```

---

## 📡 API Reference

### Core Endpoints

#### POST `/chat`
**Primary conversation endpoint**

**Request:**
```json
{
  "persona_name": "ol_technical_support",
  "user_id": "user_12345",
  "message": "My WiFi keeps disconnecting"
}
```

**Response:**
```json
{
  "message": "Let me help you troubleshoot that...",
  "confidence": "HIGH",
  "escalation_deferred": false,
  "assist_attempts_with_kb": 1,
  "sources": [
    {
      "id": "kb_doc_001",
      "source": "profile.xml",
      "preview": "WiFi troubleshooting steps..."
    }
  ],
  "router": {
    "classification": {
      "issue_category": "connectivity",
      "urgency": "medium",
      "confidence": 0.87
    }
  }
}
```

**Escalation Response:**
```json
{
  "message": "I've created a support ticket...",
  "confidence": "LOW",
  "escalation_deferred": false,
  "glpi_ticket_id": "12847",
  "sources": []
}
```

---

#### GET `/personas`
**List available personas**

**Response:**
```json
{
  "personas": [
    "ol_technical_support",
    "ol_residential_broadband",
    "ol_enterprise_fiber"
  ]
}
```

---

#### POST `/tickets/route`
**Standalone ticket classification**

**Request:**
```json
{
  "persona": "ol_technical_support",
  "description": "Cannot access VPN - error 812"
}
```

**Response:**
```json
{
  "classification": {
    "issue_category": "vpn",
    "issue_type": "authentication",
    "urgency": "high",
    "impact_scope": "single_user",
    "requires_human": false,
    "confidence": 0.91
  },
  "matches": [
    {
      "content": "Error 812 indicates invalid credentials...",
      "similarity": 0.89,
      "source": "glpi_ticket_4521"
    }
  ],
  "route_to_human": false
}
```

---

#### GET `/analytics/trends`
**Get issue clustering and trends**

**Response:**
```json
{
  "clusters": [
    {
      "cluster_id": 0,
      "label": "VPN Authentication Issues",
      "size": 23,
      "trend": "emerging",
      "top_entities": ["VPN", "error_812", "Windows"],
      "confidence": 0.78
    }
  ],
  "generated_at": "2025-11-10T14:30:00Z"
}
```

---

#### POST `/feedback`
**Submit user feedback**

**Request:**
```json
{
  "rating": 5,
  "comment": "Very helpful!",
  "source": "customer",
  "ticket_id": "12847"
}
```

---

#### GET `/metrics`
**System performance metrics**

**Response:**
```json
{
  "assistive_rate": 0.76,
  "csat_score": 4.2,
  "knowledge_growth_ratio": 1.8,
  "avg_resolution_hours": 2.3,
  "generated_at": "2025-11-10T14:30:00Z"
}
```

---

#### GET `/health`
**Health check for all services**

**Response:**
```json
{
  "status": "healthy",
  "checks": {
    "mongodb": {"status": "ok"},
    "google_drive": {"status": "ok"},
    "openai": {"status": "ok"},
    "glpi": {"status": "ok"}
  }
}
```

---

### Knowledge Management Endpoints

#### GET `/knowledge/queue`
**List pending KB articles**

**Query Params:**
- `status`: `awaiting_approval` | `approved` | `rejected`
- `persona`: Filter by persona name

---

#### POST `/knowledge/queue/<id>/approve`
**Approve a draft article**

**Request:**
```json
{
  "reviewer": "alice@example.com"
}
```

---

#### DELETE `/knowledge/queue/<id>`
**Reject/delete a draft**

---

For complete API documentation, see [`backend/usage.md`](backend/usage.md).

---

## 🎨 Frontend Console

### Dashboard Features

- **Real-Time Metrics Cards**
  - Assistive rate, CSAT, knowledge growth
  - Color-coded trend indicators
  - Responsive grid layout

- **Trend Analysis**
  - Issue clustering visualization
  - Emerging problem alerts
  - Entity extraction

- **Chat Interface**
  - XState-powered FSM
  - Typing indicators
  - Source citations
  - Ticket status tracking

- **Knowledge Base Explorer**
  - Search and filter KB articles
  - Chunk visualization
  - Metadata inspection

- **Review Queue**
  - Approve/reject drafted articles
  - Side-by-side transcript view
  - Bulk actions

### Screenshots

*(Add screenshots here once available)*

---

## 📚 Knowledge Management

### How Knowledge Is Captured

1. **GLPI Sync**  
   Background worker fetches closed/solved tickets every 30 minutes

2. **Resolution Extraction**  
   LLM extracts structured data:
   - Problem summary
   - Root cause
   - Solution steps
   - Affected entities
   - Confidence score

3. **PII Detection**  
   Scans for emails, phone numbers, sensitive data

4. **Fact Verification**  
   Ensures every fact has a supporting source sentence in the transcript

5. **Article Drafting**  
   Generates title, summary, FAQ pairs, preventive tips

6. **Review Queue**  
   Items await approval (or auto-approve if enabled)

7. **Publication**  
   Approved articles → MongoDB with embeddings → Available for RAG

### Knowledge Sources

- **Google Drive Personas:** PDFs, DOCX, TXT, Markdown
- **GLPI Resolutions:** Automatically extracted
- **Manual Uploads:** Via frontend (coming soon)

### Docling Processing

For **PDF** and **DOCX** files:
- Preserves headings, tables, lists
- OCR for scanned documents
- Semantic chunking (~512 tokens/chunk)
- Heading hierarchy context
- 20-30% better retrieval accuracy

Example chunk:
```json
{
  "content": "## WiFi Setup\n\n1. Connect router...",
  "metadata": {
    "filename": "setup_guide.pdf",
    "page": 5,
    "headings": "Installation > Network > WiFi",
    "chunk_type": "section"
  }
}
```

---

## 🔗 GLPI Integration

### Features

- **Bidirectional Sync**  
  - Pull tickets every 30 min
  - Push escalations in real-time

- **Automatic Knowledge Extraction**  
  - Extracts resolutions from closed tickets
  - Validates facts against transcripts
  - Detects and filters PII

- **Smart Escalation**  
  - Creates tickets with full diagnostic trace
  - Includes router classification
  - Attaches RAG metrics

- **Status Tracking**  
  - Monitors open tickets
  - Notifies when resolved
  - Pulls resolution summaries

### Setup

1. **Enable REST API in GLPI**  
   Admin → Setup → General → Enable REST API

2. **Generate Tokens**  
   - App token: Admin → API Clients
   - User token: User preferences → API Token

3. **Configure Environment**
   ```bash
   GLPI_HOST=https://glpi.example.com
   GLPI_APP_TOKEN=abc123...
   GLPI_API_TOKEN=xyz789...
   GLPI_SYNC_INTERVAL_SECONDS=1800
   ```

4. **Verify Health**
   ```bash
   curl http://localhost:5000/health
   ```

### Ticket Lifecycle

1. **User Query** → Low confidence response
2. **Escalation** → GLPI ticket created with transcript
3. **Agent Resolves** → Ticket marked solved in GLPI
4. **Sync Worker** → Detects closed ticket
5. **Extraction** → Parses resolution, validates facts
6. **Knowledge Pipeline** → Drafts KB article
7. **Review** → Manual approval or auto-publish
8. **RAG Update** → New knowledge available for future queries

---

## 🔬 Advanced Features

### Self-RAG Reflection

Responses include reflection tokens:
- `[RELEVANT]` / `[IRRELEVANT]` — Before answering
- `[GROUNDED]` / `[UNGROUNDED]` — After answering

Ensures model self-validates before responding.

### Grounding Validation

Multi-stage quality gates:
1. **Similarity threshold:** avg ≥ 0.75, max ≥ 0.80
2. **LLM judge:** Binary YES/NO relevance
3. **Context precision:** Term overlap > 0.40
4. **Grounding score:** Token support ratio > 0.60

Escalates if any gate fails.

### Adaptive Escalation

- **Minimum attempts:** 2 turns (configurable)
- **Maximum attempts:** 4 turns before forcing escalation
- **Confidence tracking:** Per-user cumulative score
- **Router override:** Immediate escalation if `needs_supervisor=true`

### CRM Enrichment

Automatically extracts from conversation:
- Contact info (email, phone, company)
- Business context (use case, budget, timeline)
- Technical details (current solution, integration needs)
- Behavioral signals (tone, urgency)

Stores in MongoDB `user_profiles` collection.

### Trend Analysis

- **Clustering:** MiniBatchKMeans on resolution embeddings
- **Trend Detection:** Emerging vs. declining issues
- **Entity Extraction:** Identifies affected products/services
- **Temporal Analysis:** 7-day rolling window

---

## 👨‍💻 Development

### Project Structure

```
obvix-lake/
├── backend/
│   ├── app.py                    # Main Flask app
│   ├── requirements.txt
│   ├── .env                      # Environment config
│   ├── client.json              # Google service account
│   │
│   ├── config/
│   │   └── crm_profile_config.json
│   │
│   ├── services/
│   │   ├── rag_pipeline.py      # Hybrid RAG
│   │   ├── knowledge_pipeline.py
│   │   ├── ticket_router.py
│   │   ├── glpi_service.py
│   │   ├── docling_service.py   # Document processing
│   │   ├── analytics.py
│   │   ├── feedback.py
│   │   └── crm_enrichment.py
│   │
│   └── personas_examples/
│       ├── airtel_support.xml
│       └── raspberry_pi_customer.xml
│
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   │
│   └── src/
│       ├── App.tsx
│       ├── main.tsx
│       │
│       ├── app/
│       │   ├── api/             # API client
│       │   ├── fsm/             # XState machines
│       │   ├── providers/       # Context providers
│       │   ├── routes/          # Router config
│       │   └── store/           # Zustand stores
│       │
│       ├── components/
│       │   ├── chat/
│       │   ├── knowledge/
│       │   └── layout/
│       │
│       └── pages/
│           ├── Dashboard.tsx
│           ├── KnowledgeBase.tsx
│           ├── Analytics.tsx
│           └── Tickets.tsx
│
└── README.MD
```

### Backend Development

**Install dev dependencies:**
```bash
pip install pytest pytest-cov black flake8
```

**Run tests:**
```bash
pytest
```

**Code formatting:**
```bash
black backend/
```

**Linting:**
```bash
flake8 backend/
```

### Frontend Development

**Type checking:**
```bash
npm run typecheck
```

**Linting:**
```bash
npm run lint
```

**Format code:**
```bash
npm run format
```

**Build for production:**
```bash
npm run build
```

### Adding a New Persona

1. Create Google Drive folder: `ol_my_persona`
2. Add `profile.xml` with persona configuration
3. Upload knowledge documents (PDFs, DOCX, etc.)
4. Wait for sync cycle (~60 seconds)
5. Verify in frontend: `GET /personas`
6. Test: `POST /chat` with `persona_name: "ol_my_persona"`

### Extending the Knowledge Pipeline

Edit `backend/services/knowledge_pipeline.py`:

```python
def _custom_extractor(self, resolution: Dict) -> Dict:
    # Your custom logic
    return {
        "title": "...",
        "summary": "...",
        "steps": [],
        "tags": []
    }
```

---

## 🚢 Deployment

### Production Checklist

- [ ] Set `KNOWLEDGE_AUTO_APPROVE=false` for human review
- [ ] Configure MongoDB replica set for high availability
- [ ] Use MongoDB Atlas for managed vector search
- [ ] Set up HTTPS with reverse proxy (nginx/Caddy)
- [ ] Configure CORS for production domain
- [ ] Enable rate limiting on `/chat` endpoint
- [ ] Set up monitoring (Prometheus, Grafana)
- [ ] Configure log aggregation (ELK, CloudWatch)
- [ ] Create Google Drive service account with minimal permissions
- [ ] Rotate API keys regularly
- [ ] Set `LOG_LEVEL=WARNING` or `ERROR`
- [ ] Enable MongoDB authentication
- [ ] Use environment secrets manager (Vault, AWS Secrets Manager)

### Docker Deployment (Example)

**Backend Dockerfile:**
```dockerfile
FROM python:3.10-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
CMD ["gunicorn", "-w", "4", "-b", "0.0.0.0:5000", "app:app"]
```

**Frontend Dockerfile:**
```dockerfile
FROM node:18-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db

  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=mongodb://mongodb:27017/
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  mongo-data:
```

### Scaling Considerations

- **Horizontal Scaling:** Run multiple Flask workers behind load balancer
- **MongoDB Sharding:** For > 1TB knowledge bases
- **Redis Cache:** Cache frequent RAG queries
- **Background Workers:** Separate processes for sync, analytics, knowledge pipeline
- **CDN:** Serve frontend assets from CDN
- **Vector DB:** Consider Pinecone/Weaviate for massive scale

---

## 🤝 Contributing

This is a **proprietary project** by Obvix Labs. See [LICENSE](#-license) for usage restrictions.

For authorized contributors:

1. Fork the repository (if permissions granted)
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

### Code Standards

- **Python:** PEP 8, type hints, docstrings
- **TypeScript:** ESLint rules, strict mode
- **Commits:** Conventional Commits format
- **Tests:** Maintain > 80% coverage

---

## 📄 License

**Copyright © 2025 Obvix Labs (obvix.io)**  
**All Rights Reserved.**

⚠️ **THIS IS NOT OPEN SOURCE**

This repository is publicly visible for submission and demonstration purposes only. The code is **proprietary** and owned by Obvix Labs.

### You MAY:
✅ View the code for educational purposes  
✅ Reference this project with proper attribution  
✅ Review as part of authorized evaluation

### You MAY NOT:
❌ Use this code in your own projects  
❌ Copy, fork, or redistribute the code  
❌ Modify or create derivative works  
❌ Use for commercial purposes  

**For permissions or licensing inquiries:**  
📧 hello@karanprasad.com  
🌐 https://obvix.io

See [`LICENSE`](LICENSE) for full terms.

---

## 📞 Contact & Support

**Obvix Labs**  
🌐 Website: [obvix.io](https://obvix.io)  
📧 Email: hello@karanprasad.com  
👤 Founder: Karan Prasad

---

## 🙏 Acknowledgments

### Third-Party Open Source Components

This project utilizes the following open-source libraries:

**Backend:**
- [Flask](https://flask.palletsprojects.com/) (BSD-3-Clause)
- [OpenAI Python SDK](https://github.com/openai/openai-python) (Apache-2.0)
- [PyMongo](https://pymongo.readthedocs.io/) (Apache-2.0)
- [Docling](https://github.com/DS4SD/docling) (MIT)
- [scikit-learn](https://scikit-learn.org/) (BSD-3-Clause)
- [Google API Client](https://github.com/googleapis/google-api-python-client) (Apache-2.0)

**Frontend:**
- [React](https://react.dev/) (MIT)
- [TypeScript](https://www.typescriptlang.org/) (Apache-2.0)
- [Vite](https://vitejs.dev/) (MIT)
- [Tailwind CSS](https://tailwindcss.com/) (MIT)
- [XState](https://xstate.js.org/) (MIT)
- [Zustand](https://zustand-demo.pmnd.rs/) (MIT)

See [`LICENSE`](LICENSE) for complete attribution.

---

<div align="center">

**Built with ❤️ by Obvix Labs**

[Report Bug](https://github.com/thtskaran/obvix-lake/issues) • [Request Feature](https://github.com/thtskaran/obvix-lake/issues)

</div>
