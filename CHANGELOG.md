# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-20

### Added - Sprint 1 MVP

#### Architecture & Infrastructure
- Full TypeScript monorepo with backend + frontend workspaces
- Docker Compose setup for local development
- PostgreSQL 15 with pgvector extension for semantic search (ready)
- Prisma ORM with comprehensive schema and migrations
- Environment-based configuration with validation (Zod)

#### Backend
- Fastify REST API with JWT authentication
- Magic link authentication (passwordless)
- Session management with module-based interview flow
- Voice pipeline: Whisper STT + OpenAI TTS
- LLM integration: GPT-4o for agent + extraction
- Structured extraction with JSON schema validation
- Consolidation service with deduplication and merging
- Cost tracking for all OpenAI API calls
- Rate limiting and CORS protection
- Static file serving for audio uploads

#### Core Services
- **AgentService**: Interview orchestration, question generation, module management
- **ExtractorService**: Structured data extraction from conversations
- **ConsolidatorService**: Merge and deduplicate knowledge base entries
- **OpenAIService**: Unified interface for Whisper, TTS, GPT-4o, embeddings
- **AuthService**: Magic link creation and verification

#### Data Model
- Person, Session, Turn (conversation)
- Fact, TimelineEntry, Skill, Preference, Artifact
- OpenQuestion (knowledge gaps)
- Summary (extraction results)
- CostTracking, SystemLog

#### Interview Modules
- Profile Header (current role, location, education)
- Timeline (career history with KPIs and achievements)
- Skills, Principles, Assets, Stakeholders, Goals (schemas ready, prompts TBD)

#### Prompts
- System Agent: Interview orchestration with business tone
- Extractor: Structured JSON extraction with confidence scoring
- Consolidator: Deduplication and merge logic (ready for LLM enhancement)

#### Frontend
- Next.js 14 App Router with TypeScript
- PWA-ready (manifest.json)
- Home dashboard with session list and KB stats
- Interview page with push-to-talk UI
- Real-time status indicators (idle/listening/processing/speaking)
- Audio recording via MediaRecorder API
- Responsive design with TailwindCSS

#### Connector Framework
- Base connector interface (IConnector)
- MockConnector: In-memory testing connector
- FileConnector: Local filesystem / S3-compatible storage
- ConnectorManager: Central registry and router
- Ready for future integrations (Google Calendar, Gmail, Notion, Slack, etc.)

#### Developer Experience
- TypeScript end-to-end with strict type checking
- Prisma migrations with seed data
- Vitest setup for unit and integration tests
- ESLint + Prettier configuration
- Hot reload for backend and frontend
- Structured logging with Pino
- Health check endpoints

#### Documentation
- Comprehensive README with setup instructions
- ARCHITECTURE.md with detailed technical decisions
- API_EXAMPLES.md with curl examples
- Inline code documentation

### Technical Decisions

- **STT+TTS over Realtime API**: 10-40x cost savings, better quality, full control
- **PostgreSQL + pgvector**: Single database for relational + vector data
- **Fastify over Express**: 2x performance, better schema validation
- **Prisma**: Best TypeScript ORM, excellent migrations
- **GPT-4o**: Optimal balance of quality, speed, and cost
- **Magic Links**: Passwordless auth, mobile-friendly

### Cost Optimization
- Audio transcripts stored, audio files optional
- Token usage tracking per service and session
- Estimated $27/month for 1000 interview minutes

### Security & Privacy
- No sensitive data collection (politics, sexuality, detailed family/health)
- Audio storage disabled by default
- JWT with configurable expiration
- Rate limiting per user and IP
- CORS whitelist

## [Unreleased] - Sprint 2 Roadmap

### Planned
- [ ] Remaining modules: Skills, Principles, Assets, Stakeholders, Goals
- [ ] Semantic search implementation (pgvector + embeddings)
- [ ] Enhanced consolidation with LLM-based conflict resolution
- [ ] Frontend KB review and edit interface
- [ ] Session resume functionality
- [ ] Export enhancements (formatted Markdown, PDF)
- [ ] First production connector (Google Calendar or Notion)
- [ ] Comprehensive test coverage (>80%)
- [ ] Service worker for offline PWA support
- [ ] Performance optimizations (prompt caching, token reduction)

### Under Consideration
- [ ] Multiple voice options (user preference)
- [ ] Real-time WebSocket for lower latency
- [ ] Multi-language support (i18n)
- [ ] Collaborative interviews (multiple participants)
- [ ] Integration marketplace
- [ ] Mobile native apps (React Native)
- [ ] Voice activity detection (hands-free mode)
- [ ] Analytics dashboard

---

## Version History

- **0.1.0** (2024-01-20): Sprint 1 MVP - Core interview functionality with profile_header and timeline modules
