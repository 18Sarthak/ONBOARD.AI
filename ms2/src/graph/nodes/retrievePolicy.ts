import { GraphState } from '../graph';
import { retrieve, formatChunksForPrompt } from '../../rag/retrieve';
import { prisma } from '../../db/prismaClient';

/**
 * Node: retrievePolicy
 *
 * Embeds the employee's message and retrieves the top-5 most relevant
 * policy chunks from the vector store. Formats them into a context string
 * that subsequent nodes inject into LLM prompts.
 *
 * Writes one AgentLog row documenting which sources were found.
 */
export async function retrievePolicy(state: typeof GraphState.State): Promise<Partial<typeof GraphState.State>> {
  const { requestId, employeeMessage } = state;

  const chunks = await retrieve(employeeMessage, 5);
  const retrievedPolicy = formatChunksForPrompt(chunks);

  const sourceList =
    chunks.length > 0
      ? chunks.map((c) => `${c.sourceDoc} (similarity: ${c.similarity.toFixed(3)})`).join(', ')
      : 'none';

  const reasoning = `Retrieved ${chunks.length} policy chunk(s) for the query: "${employeeMessage}". Sources: ${sourceList}.`;

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'retrievePolicy',
      reasoning,
      result: {
        chunkCount: chunks.length,
        sources: chunks.map((c) => c.sourceDoc),
      },
    },
  });

  return { retrievedPolicy };
}
