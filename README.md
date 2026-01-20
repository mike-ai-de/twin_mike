# Voice-first Knowledge Base Interview Agent

<parameter name="content"># Voice-first Knowledge Base Interview Agent

A hands-free, voice-driven interview system that builds and maintains a structured knowledge base about your professional experience, skills, and expertise.

## 🎯 Business Outcome

- **Hands-free**: Conduct interviews while driving, walking, or multitasking
- **Structured KB**: Automatically extract and organize facts, timeline, skills, preferences
- **Continuous Growth**: Each session adds to your living knowledge base
- **Multi-system Ready**: Architecture designed for future integrations (Calendar, Email, CRM, Files, etc.)

## 🏗️ Architecture

### Tech Stack

- **Frontend**: Next.js 14 (PWA-ready) + React + TailwindCSS
- **Backend**: Fastify + Prisma + TypeScript
- **Database**: PostgreSQL 15 + pgvector (semantic search)
- **Voice**: OpenAI Whisper (STT) + OpenAI TTS
- **LLM**: GPT-4o with Structured Outputs

**Why STT+TTS instead of Realtime API?**
- 10-40x cheaper ($0.006/min vs $0.06-0.24/min)
- Better transcription quality (Whisper specialized model)
- Full control over pipeline (store transcripts, retry logic, cost tracking)
- Acceptable latency for interview use case (2.5-4s total)

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed decision rationale.

## 📦 Repository Structure

```
.
├── backend/                 # Fastify + Prisma backend
│   ├── prisma/             # Database schema + migrations
│   ├── src/
│   │   ├── config/         # Environment config
│   │   ├── connectors/     # System integration framework
│   │   ├── lib/            # Shared utilities
│   │   ├── prompts/        # LLM prompts (agent, extractor, consolidator)
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── types/          # TypeScript types + schemas
│   └── Dockerfile
│
├── frontend/               # Next.js PWA frontend
│   ├── src/
│   │   ├── app/           # Next.js App Router pages
│   │   ├── components/    # React components
│   │   └── lib/           # API client, utilities
│   └── Dockerfile
│
├── docker-compose.yml     # Local development setup
├── ARCHITECTURE.md        # Detailed architecture decisions
└── README.md             # This file
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker + Docker Compose
- OpenAI API key

### 1. Clone and Setup

```bash
git clone <repo-url>
cd twin_mike

# Copy environment files
cp backend/.env.example backend/.env
```

### 2. Configure Environment

Edit `backend/.env`:

```env
DATABASE_URL="postgresql://vkb_user:vkb_password@localhost:5432/vkb_dev"
JWT_SECRET="your_secret_at_least_32_characters_long"
OPENAI_API_KEY="sk-..."
```

### 3. Start with Docker Compose

```bash
# Start all services (PostgreSQL + Backend + Frontend)
docker-compose up -d

# Check logs
docker-compose logs -f

# Run database migrations
docker-compose exec backend npm run db:migrate

# Seed example data
docker-compose exec backend npm run db:seed
```

### 4. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **Health Check**: http://localhost:3001/health
- **Prisma Studio**: `docker-compose exec backend npm run db:studio`

## 🧑‍💻 Local Development (without Docker)

### Backend

```bash
cd backend

# Install dependencies
npm install

# Setup database (requires PostgreSQL with pgvector)
npm run db:migrate
npm run db:generate
npm run db:seed

# Start dev server
npm run dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

## 📚 API Documentation

### Authentication

**Magic Link Flow:**

```bash
# 1. Request magic link
POST /auth/start
{
  "email": "user@example.com"
}

# 2. Verify token (from email or dev logs)
POST /auth/verify
{
  "token": "..."
}

# Returns JWT token
{
  "success": true,
  "token": "eyJ...",
  "personId": "...",
  "email": "user@example.com"
}
```

### Sessions

```bash
# Create new session
POST /sessions
Authorization: Bearer <token>
{
  "module": "profile_header"  # optional
}

# Get all sessions
GET /sessions
Authorization: Bearer <token>

# Get session details
GET /sessions/:id
Authorization: Bearer <token>

# Add turn (upload audio)
POST /sessions/:id/turns
Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: audio=<audio_blob>

# Get next agent question
POST /sessions/:id/agent/next
Authorization: Bearer <token>

# Manually trigger extraction
POST /sessions/:id/extract
Authorization: Bearer <token>
```

### Knowledge Base

```bash
# Search KB
GET /kb/search?q=product+management&limit=20
Authorization: Bearer <token>

# Get stats
GET /kb/stats
Authorization: Bearer <token>

# Export KB
GET /kb/export?format=json
GET /kb/export?format=markdown
Authorization: Bearer <token>
```

## 🎤 Using the Voice Interview

1. **Start Session**: Click "Start New Session" on homepage
2. **Push-to-Talk**: Press and hold the microphone button
3. **Speak**: Answer the agent's question
4. **Release**: Let go to send your recording
5. **Listen**: Agent processes your answer and asks next question
6. **Repeat**: Continue the conversation

**Status Indicators:**
- 🎤 **Ready**: Press to start speaking
- ⏸ **Listening**: Release to send
- ⏳ **Processing**: Transcribing + thinking
- 🔊 **Speaking**: Agent is responding

## 📊 Data Model

### Core Entities

- **Person**: User profile
- **Session**: Interview session (tracks module progress)
- **Turn**: Single exchange (user or agent message)
- **Fact**: Atomic knowledge unit (current role, location, education, etc.)
- **TimelineEntry**: Career history entry
- **Skill**: Skill with proficiency level + evidence
- **Preference**: Work style, communication, leadership preferences
- **Artifact**: Templates, processes, playbooks, links
- **OpenQuestion**: Identified knowledge gaps
- **Summary**: Extraction results per session block

### Interview Modules

1. **profile_header**: Basic facts (role, location, education)
2. **timeline**: Career history with achievements + KPIs
3. **skills**: Technical and soft skills + proficiency
4. **principles**: Leadership style, communication preferences
5. **assets**: Templates, playbooks, processes
6. **stakeholders**: Key relationships
7. **goals**: Career aspirations

Each module runs ~8-12 turns before extraction and consolidation.

## 🔌 Connector Framework

### Built-in Connectors

1. **MockConnector**: In-memory dummy data for testing
2. **FileConnector**: Local filesystem or S3-compatible storage

### Usage

```typescript
import { connectorManager } from './src/connectors/connector.manager';

// Create record
await connectorManager.execute('mock', 'create', 'calendar_event', {
  title: 'Meeting',
  start: '2024-01-20T10:00:00Z'
});

// Search
const results = await connectorManager.execute('file', 'search', 'documents', 'playbook');

// Health check all
const health = await connectorManager.healthCheckAll();
```

### Adding New Connectors

```typescript
import { BaseConnector } from './base.connector';

export class GoogleCalendarConnector extends BaseConnector {
  id = 'google-calendar';
  name = 'Google Calendar';
  capabilities = ['read', 'write', 'search'];

  async create(entity: string, data: any) {
    // Implement Google Calendar API call
  }

  // ... implement other methods
}

// Register
connectorManager.register(new GoogleCalendarConnector());
```

## 🧪 Testing

### Run Tests

```bash
cd backend
npm test                 # Run all tests
npm run test:watch      # Watch mode
```

### Test Coverage

- Unit tests for services (agent, extractor, consolidator)
- Integration tests for API routes
- Connector tests (mock, file)

## 📈 Cost Tracking

All OpenAI API calls are automatically tracked in `cost_tracking` table.

```sql
SELECT
  service,
  SUM(cost_usd) as total_cost,
  SUM(units) as total_units
FROM cost_tracking
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY service;
```

**Estimated Costs (1000 interview minutes/month):**
- Whisper STT: $6
- TTS: $10
- GPT-4o (agent + extraction): $11
- **Total: ~$27/month**

## 🔒 Security & Privacy

- **Audio Storage**: Disabled by default (only transcripts stored)
- **Auth**: Passwordless magic links + JWT
- **Rate Limiting**: 100 req/min per user
- **CORS**: Strict origin whitelist
- **Guardrails**: No politics, sexuality, detailed family/health data

## 🌍 Deployment

### Railway (Recommended)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
railway up
```

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL=<managed_postgres_url>
JWT_SECRET=<strong_random_secret>
OPENAI_API_KEY=<your_key>
CORS_ORIGIN=https://your-domain.com
STORE_AUDIO=false
```

### Docker Production Build

```bash
# Build images
docker-compose -f docker-compose.prod.yml build

# Deploy
docker-compose -f docker-compose.prod.yml up -d
```

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker-compose ps

# View logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up -d
```

### Audio Recording Not Working

- **Chrome/Edge**: Requires HTTPS in production
- **Safari**: May need explicit microphone permission
- **Firefox**: Check `about:preferences` → Privacy → Microphone

### OpenAI API Errors

- Check API key is valid: `backend/.env`
- Verify API key has sufficient credits
- Check rate limits: https://platform.openai.com/account/rate-limits

## 📝 Development Workflow

### Adding a New Module

1. Update `MODULES` in `backend/src/types/index.ts`
2. Add module-specific extraction logic in `extractor.service.ts`
3. Update prompts if needed
4. Add seed data for testing

### Modifying Extraction Schema

1. Update Zod schemas in `backend/src/types/index.ts`
2. Update `system-extractor.txt` prompt with new schema
3. Update consolidator logic if needed
4. Run tests to verify

### Database Migrations

```bash
# Create migration after schema change
cd backend
npm run db:migrate -- --name add_new_field

# Apply migrations
npm run db:migrate:deploy
```

## 🤝 Contributing

1. Create feature branch
2. Make changes
3. Add tests
4. Submit PR

## 📄 License

MIT

## 🙏 Acknowledgments

- OpenAI for Whisper, TTS, and GPT-4o APIs
- Prisma for excellent TypeScript DX
- Fastify for high-performance backend

---

## Sprint 1 ✅ Complete

- ✅ End-to-end voice interview flow
- ✅ STT (Whisper) + TTS pipeline
- ✅ Agent service with module-based interviews
- ✅ Extraction + consolidation
- ✅ Profile Header + Timeline modules
- ✅ Frontend with push-to-talk
- ✅ Connector framework (mock + file)
- ✅ Seed data + example session

## Sprint 2 🚧 Next Steps

1. **Remaining Modules**: skills, principles, assets, stakeholders, goals
2. **Semantic Search**: Implement pgvector embeddings + search API
3. **Consolidation Refinement**: Better deduplication logic, conflict resolution
4. **Export**: Enhanced JSON + Markdown export with formatting
5. **Frontend Enhancements**:
   - Review/edit extracted data screen
   - Session resume
   - KB search interface
6. **Real Connector**: Implement one production connector (e.g., Google Calendar, Notion)
7. **Tests**: Comprehensive test coverage for all services
8. **Performance**: Optimize extraction prompts, reduce token usage
9. **PWA**: Service worker, offline support, install prompt

---

**Built with ❤️ for productive knowledge capture**
