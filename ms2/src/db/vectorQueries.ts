import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

// Reuse a single pool for all vector queries — initialised lazily on first call.
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');
    _pool = new Pool({ connectionString });
  }
  return _pool;
}

export interface PolicyChunkResult {
  id: string;
  content: string;
  sourceDoc: string;
  similarity: number;
}

/**
 * Runs a pgvector cosine similarity search against the PolicyChunk table.
 *
 * Uses the `<=>` operator (cosine distance) so results are ordered from
 * most similar (distance ≈ 0) to least similar (distance ≈ 2).
 *
 * @param embedding  384-dimensional float array produced by all-MiniLM-L6-v2
 * @param limit      Maximum number of chunks to return (default 5)
 */
export async function similaritySearch(
  embedding: number[],
  limit = 5
): Promise<PolicyChunkResult[]> {
  const pool = getPool();
  const vectorLiteral = `[${embedding.join(',')}]`;

  const result = await pool.query<PolicyChunkResult>(
    `SELECT
      id,
      content,
      "sourceDoc",
      (1 - (embedding <=> $1::vector))::float AS similarity
    FROM "PolicyChunk"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $2`,
    [vectorLiteral, limit]
  );

  return result.rows;
}

