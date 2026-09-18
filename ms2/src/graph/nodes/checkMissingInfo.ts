import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { GraphState } from '../graph';
import { prisma } from '../../db/prismaClient';

const llm = new ChatGroq({
  model: 'groq/compound',
  temperature: 0,
});

/**
 * Node: checkMissingInfo
 *
 * Uses the LLM to analyse whether the employee's message contains all the
 * information required by the retrieved policy to process the request.
 *
 * If fields are missing:
 *   - Sets `missingFields` on state
 *   - Updates Request.status → pending_info
 *   - The graph routes to END (the employee must re-submit with more info)
 *
 * If all required info is present:
 *   - Sets `missingFields: []`
 *   - The graph continues to createDraft
 *
 * Writes one AgentLog row with the LLM's reasoning.
 */
export async function checkMissingInfo(
  state: typeof GraphState.State
): Promise<Partial<typeof GraphState.State>> {
  const { requestId, employeeMessage, retrievedPolicy } = state;

  const systemPrompt = `You are an HR workflow assistant. Your task is to determine whether an employee's request message contains all required fields described in the company policy excerpts below.

POLICY CONTEXT:
${retrievedPolicy}

INSTRUCTIONS:
1. Identify what information the policy requires to process this type of request.
2. Determine whether the employee's message provides all of that information.
3. If any required fields are missing, list them clearly as a JSON array of strings.
4. Respond ONLY with valid JSON in this exact format:
{
  "missingFields": ["field1", "field2"],
  "reasoning": "Explanation of what is present and what is missing."
}
If nothing is missing, return: { "missingFields": [], "reasoning": "All required information is present." }`;

  const humanPrompt = `Employee request: "${employeeMessage}"`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt),
  ]);

  let parsed: { missingFields: string[]; reasoning: string };
  try {
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    // Strip markdown code fences if the LLM wrapped its response
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    // Fallback: treat parse failure as "no missing fields" to avoid getting stuck
    parsed = { missingFields: [], reasoning: 'Could not parse LLM response; assuming all fields present.' };
  }

  const { missingFields, reasoning } = parsed;
  const hasMissingFields = missingFields && missingFields.length > 0;

  // Update the Request status in the DB
  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: hasMissingFields ? 'pending_info' : 'draft',
    },
  });

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'checkMissingInfo',
      reasoning,
      result: {
        missingFields: missingFields ?? [],
        hasMissingFields,
      },
    },
  });

  return { missingFields: missingFields ?? [] };
}
