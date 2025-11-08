# AI Support Agent Console

A minimal, scalable foundation for building an AI-powered customer support agent console using modern web technologies.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production  
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type checking
npm run typecheck

# Format code
npm run format
```

## 📁 Project Structure

```
src/
├── app/                    # Application core
│   ├── routes/
│   │   └── index.tsx       # Route definitions (React Router v6)
│   ├── providers/
│   │   └── AppProviders.tsx # Router + theme providers shell
│   ├── store/
│   │   ├── chat.store.ts   # Chat state (Zustand)
│   │   └── fsm.store.ts    # FSM state (Zustand)
│   ├── fsm/
│   │   └── support.machine.ts # Support workflow (XState)
│   └── api/
│       └── client.ts       # API client wrapper
├── components/             # Reusable UI components
│   ├── layout/
│   │   └── AppShell.tsx    # Main layout with sidebar/header
│   ├── chat/
│   │   └── ChatWindow.tsx  # Chat interface placeholder
│   └── common/
│       └── KPIStat.tsx     # KPI metric display component
├── pages/                  # Route-level page components
│   ├── Dashboard.tsx       # Main dashboard with KPIs
│   ├── ChatConsole.tsx     # Live chat management
│   ├── KnowledgeGraph.tsx  # Knowledge relationship visualization
│   ├── FAQManager.tsx      # FAQ content management
│   ├── Integrations.tsx    # External system connections
│   ├── Analytics.tsx       # Performance metrics & insights
│   └── Settings.tsx        # System configuration
├── types/
│   └── index.ts           # Shared TypeScript interfaces
├── utils/
│   └── index.ts           # Helper functions & utilities
└── styles/
    └── tailwind.css       # Custom Tailwind styles
```

## 🛠 Tech Stack

- **Framework**: Vite + React 18 + TypeScript
- **Routing**: React Router v6
- **State Management**: Zustand (global) + XState (workflows)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Code Quality**: ESLint + Prettier
- **Type Safety**: TypeScript with strict mode

## 🎯 Current Features (Skeleton)

- ✅ Clean project structure and file organization
- ✅ Responsive layout with sidebar navigation
- ✅ Route-based page navigation (7 main sections)
- ✅ Empty Zustand stores ready for state management
- ✅ Stub XState machine for workflow management
- ✅ Placeholder API client with typed interfaces
- ✅ Reusable UI components foundation
- ✅ TypeScript interfaces for core entities
- ✅ Tailwind CSS theming and utilities

## 🚧 Implementation Roadmap

### Phase 1: Core Infrastructure
- [ ] **Authentication & User Management**
  - Implement user authentication flows
  - Set up role-based access control
  - User session management

### Phase 2: Chat & Ticketing System  
- [ ] **Real-time Chat Implementation**
  - WebSocket connections for live messaging
  - Chat history persistence
  - Message threading and context

- [ ] **Ticketing System**
  - Ticket creation, assignment, and lifecycle
  - Priority management and escalation flows
  - Customer context and history tracking

### Phase 3: AI Integration
- [ ] **Knowledge Retrieval System**
  - Vector database integration (Pinecone/Weaviate)
  - Semantic search capabilities
  - Document ingestion and embedding pipeline

- [ ] **AI Classification & Routing**
  - Intent classification for incoming queries
  - Automated ticket routing and priority assignment  
  - Sentiment analysis for customer interactions

### Phase 4: Advanced Features
- [ ] **Knowledge Graph Implementation**
  - Graph database integration (Neo4j)
  - Entity relationship visualization
  - Dynamic knowledge discovery

- [ ] **Analytics & Reporting**
  - Performance metrics dashboard
  - Customer satisfaction tracking
  - AI model performance monitoring

### Phase 5: Integrations
- [ ] **External System Connectors**
  - CRM integrations (Salesforce, HubSpot)
  - Help desk platforms (Zendesk, Freshdesk)
  - Communication channels (Slack, Discord, WhatsApp)

## 🔧 Development Notes

### Adding New Features
1. **State Management**: Add actions to Zustand stores in `src/app/store/`
2. **Workflows**: Extend XState machine in `src/app/fsm/support.machine.ts`
3. **API Integration**: Implement endpoints in `src/app/api/client.ts`
4. **UI Components**: Build reusable components in `src/components/`
5. **Pages**: Add new routes and pages as needed

### Code Organization Principles
- **Single Responsibility**: Each file focuses on one concern
- **Type Safety**: Comprehensive TypeScript coverage
- **Modularity**: Clear separation between UI, state, and business logic
- **Scalability**: Structure supports large-team development

## 📚 Key Concepts

### State Architecture
- **Zustand**: Lightweight global state for UI and data
- **XState**: Complex workflow and business logic state machines
- **React State**: Component-local UI state only

### Folder Conventions  
- `app/`: Core application logic (routes, stores, machines)
- `components/`: Pure UI components (no business logic)
- `pages/`: Route-level components (orchestrate data + UI)
- `types/`: Shared interfaces and types
- `utils/`: Pure helper functions

---

Built with ❤️ for scalable AI support solutions# imobilothon
