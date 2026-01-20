# Voice-first KB Interview Agent - Architecture Decision Record

## Executive Summary
Full-stack TypeScript solution optimized for voice-first interaction, extensibility, and production readiness.

## Tech Stack

### Frontend
**Choice: Next.js 14 (App Router) + React + TypeScript**
- **PWA Support**: Next.js PWA plugin for offline capability and install prompts
- **Voice Recording**: Web Audio API + MediaRecorder for browser-native recording
- **State Management**: React Context + React Query for server state
- **Styling**: TailwindCSS for rapid UI development
- **Deployment**: Vercel (optimized) or any Node.js host

**Rationale:**
- Next.js provides SSR/SSG for fast initial load (critical for mobile)
- TypeScript ensures type safety across frontend-backend boundary
- No native app needed → faster MVP, cross-platform by default
- Progressive enhancement: works as website, installs as PWA

### Backend
**Choice: Node.js + Fastify + TypeScript**
- **Framework**: Fastify (2x faster than Express, better schema validation)
- **ORM**: Prisma (type-safe, excellent DX, migration management)
- **Validation**: Zod (runtime + compile-time type safety)
- **Auth**: JWT with magic link (passwordless, mobile-friendly)
- **File Storage**: Local FS for MVP, S3-compatible interface for production

**Rationale:**
- Fastify: performance + built-in schema validation + WebSocket support
- Prisma: best TypeScript ORM, handles migrations elegantly
- Zod: shared validation between frontend/backend
- No session store needed (stateless JWT)

### Database
**Choice: PostgreSQL 15+ with pgvector extension**
- **Core Data**: Relational tables (persons, sessions, turns, facts, etc.)
- **Semantic Search**: pgvector for embeddings (OpenAI text-embedding-3-small)
- **Versioning**: Append-only design with temporal queries

**Rationale:**
- PostgreSQL: proven, ACID, JSON support, full-text search
- pgvector: no external vector store needed → simpler architecture
- Single database → easier backups, ACID transactions across relational + vector data
- Cost-effective: no Pinecone/Weaviate subscription for MVP

### Voice Pipeline
**DECISION: STT + TTS (NOT Realtime API)**

**Choice: OpenAI Whisper API + OpenAI TTS API**
- **STT**: Whisper API (world-class accuracy, multilingual ready)
- **TTS**: OpenAI TTS API (alloy/nova voices, natural, low latency)
- **Flow**: Client records → upload to backend → Whisper → LLM → TTS → stream back

**Rationale:**
- **Cost**: Whisper $0.006/min, TTS $15/1M chars vs Realtime $0.06-0.24/min (10-40x cheaper)
- **Control**: Separate transcription/generation allows:
  - Storing transcripts before sending to LLM (audit, retry, cost tracking)
  - Customizable interruption logic
  - Better error handling (voice failure ≠ LLM failure)
- **Quality**: Whisper > Realtime speech recognition for complex domain terminology
- **Latency**: Acceptable for interview use case (not gaming/translation)
- **Upgrade Path**: Can add Realtime API later as premium mode

**Latency Budget (STT+TTS):**
- Audio upload: 100-300ms (streaming)
- Whisper: 300-800ms
- LLM (GPT-4): 1-2s (streaming response)
- TTS: 400-800ms (streaming)
- **Total: ~2.5-4s** (acceptable for thoughtful interview questions)

### LLM Integration
**Choice: OpenAI GPT-4o + Structured Outputs**
- **Agent**: GPT-4o for interview dialogue (fast, context-aware)
- **Extraction**: GPT-4o with JSON mode for schema extraction
- **Embeddings**: text-embedding-3-small (512 dims, $0.02/1M tokens)

**Rationale:**
- GPT-4o: best quality/speed/cost balance
- Structured Outputs: guaranteed JSON schema compliance (no parsing errors)
- OpenAI: production-ready, reliable, easy integration
- Future: can swap to Anthropic Claude, local models via connector pattern

### Connector Framework
**Design: Plugin Architecture with Standardized Interface**

```typescript
interface IConnector {
  id: string;
  name: string;
  capabilities: ('read' | 'write' | 'search' | 'webhook')[];

  // CRUD
  create(entity: string, data: any): Promise<ConnectorResult>;
  read(entity: string, id: string): Promise<ConnectorResult>;
  update(entity: string, id: string, data: any): Promise<ConnectorResult>;
  delete(entity: string, id: string): Promise<ConnectorResult>;

  // Search
  search(entity: string, query: string): Promise<ConnectorResult[]>;

  // Health
  healthCheck(): Promise<boolean>;
}
```

**MVP Connectors:**
1. **MockConnector**: Returns dummy data for testing
2. **FileConnector**: Local filesystem or S3-compatible storage

**Future Connectors (interfaces ready):**
- GoogleCalendarConnector
- GmailConnector
- NotionConnector
- SlackConnector
- SalesforceConnector

### Hosting & Deployment
**Recommendation: Docker + Railway/Render/fly.io**
- **Containerization**: Docker for consistent environments
- **Backend + Frontend**: Single container or separate (configurable)
- **Database**: Managed PostgreSQL (Railway/Render) or Supabase
- **File Storage**: S3/R2/Backblaze B2 (S3-compatible)

**Local Development:**
- Docker Compose: PostgreSQL + pgvector + app
- Hot reload for backend + frontend
- Seed data script for instant dev environment

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Push-to-Talk │  │  Session UI  │  │  Review KB   │      │
│  │   + Status   │  │   Manager    │  │    Editor    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────┬────────────────────────────────────────────────┘
             │ HTTPS/WebSocket
┌────────────┴────────────────────────────────────────────────┐
│                    BACKEND (Fastify + Prisma)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Auth + JWT  │  │   Session    │  │  Connector   │      │
│  │              │  │   Service    │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  LLM Agent   │  │  Extractor   │  │ Consolidator │      │
│  │   Service    │  │   Service    │  │   Service    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                         │
│  │  Voice STT   │  │  Voice TTS   │                         │
│  │  (Whisper)   │  │  (OpenAI)    │                         │
│  └──────────────┘  └──────────────┘                         │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────┴────────────────────────────────────────────────┐
│              PostgreSQL 15 + pgvector                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Relational  │  │   Vectors    │  │   Full-Text  │      │
│  │    Tables    │  │  (pgvector)  │  │    Search    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow: Single Turn

```
1. User presses PTT → records audio
2. Frontend uploads audio blob → POST /sessions/:id/turns
3. Backend:
   a. Saves turn record (status: processing)
   b. Sends audio to Whisper API → transcript
   c. Updates turn with transcript
   d. Sends transcript + context to Agent LLM
   e. Agent generates next question
   f. Sends question text to TTS API → audio
   g. Returns {question_text, audio_url, turn_id}
4. Frontend plays audio, displays question
5. (Repeat)

Every N turns (block completion):
6. Backend triggers extraction:
   a. Sends last N turns to Extractor LLM + schema
   b. Receives structured JSON (facts, timeline, skills, etc.)
   c. Runs consolidation (dedupe, merge, confidence update)
   d. Stores in KB tables with source_turn_ids
   e. Generates open_questions for gaps
```

## Security & Privacy

**Data Protection:**
- Audio: Optional storage, default OFF (only transcript retained)
- Encryption: TLS in transit, at-rest encryption for DB (managed by provider)
- Auth: Passwordless magic link → JWT with expiry
- Rate Limiting: 100 req/min per user, 1000/min per IP
- CORS: Strict origin whitelist

**Guardrails (Implemented via System Prompt + Backend Validation):**
- Reject: Politics, sexuality, legal advice, detailed family/health data
- Flag: Low-confidence extractions, contradictions, sensitive topics
- User Control: Export all data, delete account (GDPR-ready)

## Cost Estimation (1000 mins of interviews/month)

```
Voice:
- Whisper: 1000 min × $0.006 = $6
- TTS: ~100k words × $15/1M chars ≈ $10
LLM:
- Agent: ~500k input + 200k output tokens ≈ $8
- Extraction: ~200k tokens ≈ $3
Database:
- Managed PostgreSQL 2GB: $10-25/month (Railway/Render)
Total: ~$40-50/month for 1000 interview minutes
```

## Non-Functional Requirements

**Performance:**
- P95 API latency: <500ms (excluding LLM/voice)
- Voice response time: <4s total (see latency budget)
- Concurrent users: 100+ (Fastify handles ~40k req/s)

**Scalability:**
- Stateless backend → horizontal scaling trivial
- PostgreSQL: 10k+ sessions easily on single instance
- Future: read replicas, Redis cache layer

**Observability:**
- Structured logs (JSON) with correlation IDs
- Metrics: token usage, costs, latency per turn
- Error tracking: Sentry integration ready
- Health checks: /health endpoint

**Reliability:**
- Retry logic: 3 attempts for LLM/voice APIs with exponential backoff
- Graceful degradation: If TTS fails, return text only
- Database transactions: ACID for consistency
- Backup strategy: Daily automated backups

## Development Experience

**Type Safety:**
- End-to-end TypeScript (frontend → backend → DB)
- Prisma generates types from schema
- Zod validates runtime inputs
- tRPC could be added for full-stack type safety (optional enhancement)

**Hot Reload:**
- Frontend: Next.js Fast Refresh
- Backend: tsx watch mode
- Database: Prisma migrations auto-apply in dev

**Testing:**
- Unit: Vitest for business logic
- Integration: Test containers for DB tests
- E2E: Playwright for critical paths (optional for Sprint 1)

## Migration Path to Realtime Voice (Future)

If later switching to OpenAI Realtime API:
1. Keep existing STT+TTS as fallback
2. Add new `/sessions/:id/realtime/ws` WebSocket endpoint
3. Frontend detects support, upgrades connection
4. Backend streams audio chunks bidirectionally
5. Same extraction/consolidation pipeline (unchanged)

**Minimal changes needed** due to clean service boundaries.

## Decision Summary

| Component | Choice | Alternative Considered | Reason |
|-----------|--------|------------------------|--------|
| Frontend | Next.js + React | React Native, Flutter | PWA sufficient, faster MVP |
| Backend | Fastify + Prisma | Express, Nest.js | Performance, simplicity |
| Database | PostgreSQL + pgvector | Separate vector DB | Simpler architecture |
| Voice | STT + TTS | Realtime API | 10-40x cheaper, better control |
| LLM | GPT-4o | Claude, Llama | Structured outputs, proven |
| Hosting | Docker + Railway | Vercel + Supabase | Flexibility, cost |

## Next Steps → Implementation

Sprint 1 (Now):
- Repo structure + Docker setup
- Database schema + migrations
- Prompt engineering (system, extractor, consolidator)
- Backend core (auth, sessions, turns, agent, voice)
- Frontend (PTT, session UI, review)
- Modules: profile_header + timeline only

Sprint 2 (After MVP):
- Remaining modules (skills, principles, assets, stakeholders, goals)
- Semantic search (pgvector + embeddings)
- Consolidation logic refinement
- Export functionality (JSON + Markdown)
- Connector system expansion
