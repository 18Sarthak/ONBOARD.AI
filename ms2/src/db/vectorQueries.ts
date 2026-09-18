import { prisma } from './prismaClient';

export interface PolicyChunkResult {
  id: string;
  content: string;
  sourceDoc: string;
  similarity: number;
}

/**
 * Runs a pgvector cosine similarity search against the PolicyChunk table.
 *
 * Uses Prisma $queryRaw with the `<=>` cosine distance operator.
 * Reuses the existing Prisma TCP connection — no second WebSocket pool needed.
 *
 * @param embedding  384-dimensional float array produced by all-MiniLM-L6-v2
 * @param limit      Maximum number of chunks to return (default 5)
 */
export async function similaritySearch(
  embedding: number[],
  limit = 5
): Promise<PolicyChunkResult[]> {
  const vectorLiteral = `[${embedding.join(',')}]`;

  // Prisma $queryRaw returns plain rows; cast to our interface.
  const rows = await prisma.$queryRawUnsafe<PolicyChunkResult[]>(
    `SELECT
      id,
      content,
      "sourceDoc",
      (1 - (embedding <=> $1::vector))::float AS similarity
    FROM "PolicyChunk"
    WHERE embedding IS NOT NULL
    ORDER BY embedding <=> $1::vector
    LIMIT $2`,
    vectorLiteral,
    limit
  );

  return rows;
}

