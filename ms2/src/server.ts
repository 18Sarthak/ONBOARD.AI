import * as dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';

import { initCheckpointer } from './graph/graph';
import { startCronSweep } from './cron/sweep';
import { getPrisma } from './db/prismaClient';
import { embed } from './rag/embed';


import requestsRouter from './routes/requests';
import approvalsRouter from './routes/approvals';
import logsRouter from './routes/logs';
import agentRouter from './routes/agent';

// ---------------------------------------------------------------------------
// App setup
// ---------------------------------------------------------------------------
const app = express();

// CORS — restricted to the configured origin (ms1 dev server)
const allowedOrigin = process.env.ALLOWED_ORIGIN ?? 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// Health check — doesn't require DB, responds immediately
// ---------------------------------------------------------------------------
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ---------------------------------------------------------------------------
// API routes
// ---------------------------------------------------------------------------
app.use('/api/requests', requestsRouter);
app.use('/api/approvals', approvalsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/agent', agentRouter);

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found.' });
});

// ---------------------------------------------------------------------------
// Global error handler
// Never leaks stack traces to the client — errors are logged server-side only.
// ---------------------------------------------------------------------------
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------
async function bootstrap(): Promise<void> {
  // Initialise the Neon WebSocket adapter + Prisma client.
  // This MUST complete before any DB operations (the proxy throws if called before init).
  await getPrisma();
  console.log('✓ PostgreSQL connection established via Neon WebSocket.');

  // Warm up the Xenova embedding model at startup.
  // Without this, the first request pays a ~90MB model-download + load cost (~2 min).
  // By preloading here, all requests get fast embeddings from the in-memory pipeline.
  console.log('⏳ Warming up embedding model (this takes ~30s on first run)…');
  await embed('warmup');
  console.log('✓ Embedding model ready.');

  // Initialise the LangGraph PostgresSaver checkpointer.
  // This creates the checkpointer tables if they don't exist.
  await initCheckpointer();

  // Register the cron sweep (long-lived — runs for the lifetime of this process)
  startCronSweep();

  const port = parseInt(process.env.PORT ?? '4000', 10);
  app.listen(port, () => {
    console.log(`✓ ms2 OnboardFlow AI listening on http://localhost:${port}`);
    console.log(`  CORS origin: ${allowedOrigin}`);
    console.log(`  SLA threshold: ${process.env.SLA_MINUTES ?? '2'} minute(s)`);
    if (process.env.LANGCHAIN_TRACING_V2 === 'true' && process.env.LANGCHAIN_API_KEY) {
      console.log('  LangSmith tracing: enabled');
    } else {
      console.log('  LangSmith tracing: disabled (set LANGCHAIN_TRACING_V2=true + LANGCHAIN_API_KEY to enable)');
    }
  });
}

// ---------------------------------------------------------------------------
// Process-level error guards
// Neon's WebSocket adapter emits unhandled errors when the pooler connection
// drops (ETIMEDOUT on wss://). Catch them here so the server doesn't crash —
// Prisma reconnects automatically on the next query.
// ---------------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  const msg = String(reason);
  // Suppress known Neon WebSocket connection drop noise
  if (msg.includes('ETIMEDOUT') || msg.includes('ENETUNREACH') || msg.includes('ErrorEvent')) {
    console.warn('[server] Neon WebSocket dropped (will reconnect on next query). Suppressed.');
    return;
  }
  console.error('[server] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  const msg = err.message || String(err);
  if (msg.includes('ETIMEDOUT') || msg.includes('ENETUNREACH')) {
    console.warn('[server] Neon network error suppressed:', msg);
    return;
  }
  console.error('[server] Uncaught exception — process may be unstable:', err);
});

bootstrap().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
