# ms2 — OnboardFlow AI Backend

Persistent Node.js + TypeScript backend for the OnboardFlow AI internal HR workflow tool. Runs a LangGraph `StateGraph` agent that processes employee requests against company policies using RAG, routes them for human approval, and auto-escalates stalled requests via a cron job.

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ with the **pgvector** extension installed
- A [Groq API key](https://console.groq.com) (free tier is sufficient)

### Enable pgvector in your Postgres instance

```sql
-- Run once as a superuser
CREATE EXTENSION IF NOT EXISTS vector;
```

Or use Docker:
```bash
docker run -d \
  --name onboardflow-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=onboardflow \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in DATABASE_URL and GROQ_API_KEY
```

### 3. Run database migrations

```bash
# Runs prisma migrate deploy + the raw SQL vector migration
npm run migrate
```

Or step by step:
```bash
npx prisma migrate deploy        # Creates all tables
npx tsx prisma/applyVectorMigration.ts  # Adds vector(384) column + index
```

### 4. Generate Prisma client

```bash
npm run prisma:generate
```

### 5. Ingest policy documents

```bash
npm run ingest
```

> **First run**: downloads `Xenova/all-MiniLM-L6-v2` (~90MB ONNX model). Subsequent runs use the local cache.

### 6. Start the dev server

```bash
npm run dev
```

Server starts at `http://localhost:4000`.

---

## API Reference

### Requests

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/requests` | Submit a new HR request. Body: `{ employeeName, message }` |
| `GET` | `/api/requests/:id` | Get request state + latest status |
| `POST` | `/api/requests/:id/approve` | Approve a pending request. Body: `{ approverRole }` |
| `POST` | `/api/requests/:id/reject` | Reject a request. Body: `{ approverRole, reason? }` |

### Logs & Admin

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/logs?requestId=<id>` | Get agent reasoning logs (newest first) |
| `GET` | `/api/approvals?requestId=<id>` | Get approval records |
| `POST` | `/api/agent/run` | Manually trigger the SLA sweep (for demos) |
| `GET` | `/health` | Health check |

### Example flow

```bash
# 1. Submit a request
curl -X POST http://localhost:4000/api/requests \
  -H 'Content-Type: application/json' \
  -d '{"employeeName":"Alice","message":"I need 2 weeks of medical leave starting October 1st for surgery recovery. My employee ID is EMP-1042."}'

# => { "requestId": "abc-123..." }

# 2. Poll status
curl http://localhost:4000/api/requests/abc-123...

# 3. Check agent reasoning
curl "http://localhost:4000/api/logs?requestId=abc-123..."

# 4. Approve
curl -X POST http://localhost:4000/api/requests/abc-123.../approve \
  -H 'Content-Type: application/json' \
  -d '{"approverRole":"HR Business Partner"}'

# 5. Trigger sweep immediately (demo — don't wait 2 minutes)
curl -X POST http://localhost:4000/api/agent/run
```

---

## Architecture

```
POST /api/requests
       │
       ▼
  Create Request (status: draft)
       │
       ▼ (async, background)
  ┌─────────────────────────────────────────┐
  │          LangGraph StateGraph           │
  │                                         │
  │  retrievePolicy                         │
  │    └─ pgvector similarity search        │
  │                                         │
  │  checkMissingInfo (ChatGroq)            │
  │    ├─ missing? → status: pending_info   │
  │    └─ complete → createDraft            │
  │                                         │
  │  createDraft (ChatGroq)                 │
  │    └─ structured JSON draft             │
  │                                         │
  │  routeForApproval                       │
  │    └─ interrupt() ← suspended here      │
  │            │                            │
  │   POST /approve or /reject              │
  │     (Command resume)                    │
  │            │                            │
  │    ┌───────┴──────┐                     │
  │  close          checkMissingInfo        │
  │ (done)         (back to start)          │
  └─────────────────────────────────────────┘
       │
  node-cron (every 1 min)
    └─ escalate if pending_approval > SLA_MINUTES
```

Every node writes an `AgentLog` row with:
- `nodeName` — which node executed
- `reasoning` — plain-language explanation of the decision
- `result` — JSON output

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `GROQ_API_KEY` | ✅ | Groq API key for llama-3.3-70b-versatile |
| `LANGCHAIN_API_KEY` | ❌ | LangSmith tracing (optional) |
| `LANGCHAIN_TRACING_V2` | ❌ | Set to `true` to enable LangSmith |
| `ALLOWED_ORIGIN` | ❌ | CORS origin (default: `http://localhost:5173`) |
| `PORT` | ❌ | Server port (default: `4000`) |
| `SLA_MINUTES` | ❌ | Escalation threshold in minutes (default: `2` for demo) |

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS |
| `npm run ingest` | Embed and store policy documents |
| `npm run migrate` | Run Prisma + vector migrations |
| `npm run prisma:generate` | Regenerate Prisma client after schema changes |
| `npm run prisma:studio` | Open Prisma Studio GUI |
