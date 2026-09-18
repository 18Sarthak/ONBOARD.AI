/**
 * src/db/prismaClient.ts
 *
 * Prisma Client using Neon's serverless WebSocket adapter.
 * This bypasses direct TCP/TLS negotiation (which causes P1011 OpenSSL errors
 * on platforms like Render) by routing queries through Neon's WebSocket proxy.
 *
 * Singleton pattern: getPrisma() initialises once at server startup.
 * All modules import the `prisma` proxy which throws if called before bootstrap().
 */
import { PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Use the ws package as the WebSocket implementation in Node.js environments.
neonConfig.webSocketConstructor = ws;

let _client: PrismaClient | null = null;

/**
 * Returns the singleton PrismaClient.
 * MUST be awaited once in bootstrap() before handling requests.
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (_client) return _client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('[prisma] DATABASE_URL environment variable is not set.');
  }

  const adapter = new PrismaNeon({ connectionString });

  _client = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

  // Test the connection eagerly
  await _client.$connect();

  return _client;
}

/**
 * Synchronous proxy for `prisma` — safe to use after getPrisma() has resolved.
 * All graph nodes and route handlers import this; by the time requests arrive,
 * bootstrap() has already called getPrisma() and populated _client.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop: string | symbol) {
    if (!_client) {
      throw new Error(
        '[prisma] Not initialised. Ensure bootstrap() calls `await getPrisma()` before handling requests.'
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const val = (_client as any)[prop];
    return typeof val === 'function' ? val.bind(_client) : val;
  },
});
