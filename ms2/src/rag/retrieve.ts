import { embed } from './embed';
import { similaritySearch, PolicyChunkResult } from '../db/vectorQueries';

export interface RetrievedChunk {
  content: string;
  sourceDoc: string;
  similarity: number;
}

/**
 * Retrieves the top-K most relevant policy chunks for a given query string.
 *
 * 1. Embeds the query locally using Xenova/all-MiniLM-L6-v2.
 * 2. Runs pgvector cosine similarity search via raw SQL.
 * 3. Returns chunks ordered by descending similarity.
 *
 * @param query  The employee's message or a sub-query derived from it.
 * @param limit  Number of chunks to return (default: 5).
 */
export async function retrieve(query: string, limit = 5): Promise<RetrievedChunk[]> {
  const queryEmbedding = await embed(query);
  const results: PolicyChunkResult[] = await similaritySearch(queryEmbedding, limit);

  return results.map((r) => ({
    content: r.content,
    sourceDoc: r.sourceDoc,
    similarity: r.similarity,
  }));
}

/**
 * Formats retrieved chunks into a single context string for use in LLM prompts.
 */
export function formatChunksForPrompt(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant policy documents were found.';
  }
  return chunks
    .map(
      (c, i) =>
        `[Policy Excerpt ${i + 1} — Source: ${c.sourceDoc}]\n${c.content}`
    )
    .join('\n\n---\n\n');
}
