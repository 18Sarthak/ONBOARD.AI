/**
 * src/db/prismaClient.ts
 *
 * Standard Prisma Client using direct TCP connection to Neon PostgreSQL.
 * No WebSocket adapter needed — the DATABASE_URL points to the direct (non-pooler)
 * endpoint which is reachable via standard TCP port 5432.
 *
 * Singleton pattern: getPrisma() initialises once at server startup.
 * All modules import the `prisma` proxy which throws if called before bootstrap().
 */
import { PrismaClient } from '@prisma/client';

let _client: PrismaClient | null = null;

/**
 * Returns the singleton PrismaClient.
 * MUST be awaited once in bootstrap() before handling requests.
 */
export async function getPrisma(): Promise<PrismaClient> {
  if (_client) return _client;

  _client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    datasources: {
      db: { url: process.env.DATABASE_URL },
    },
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
