import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { GraphState } from '../graph';
import { prisma } from '../../db/prismaClient';

const llm = new ChatGroq({
  model: 'groq/compound',
  temperature: 0.2,
});

/**
 * Node: createDraft
 *
 * Uses the LLM to produce a structured JSON draft of the HR request,
 * summarising the employee's intent, the relevant policy, and all known
 * request details. This draft is stored on the Request row and shown
 * to the approver when they review the pending request.
 *
 * Writes one AgentLog row with the draft content and reasoning.
 */
export async function createDraft(
  state: typeof GraphState.State
): Promise<Partial<typeof GraphState.State>> {
  const { requestId, employeeMessage, retrievedPolicy } = state;

  const systemPrompt = `You are an HR workflow assistant. Based on the employee's message and the relevant company policy, produce a structured JSON draft of the HR request that will be sent for approval.

POLICY CONTEXT:
${retrievedPolicy}

INSTRUCTIONS:
Respond ONLY with valid JSON in this exact format:
{
  "requestType": "short type label (e.g. Medical Leave, Equipment Request, Travel Approval)",
  "department": "most relevant approving department (e.g. HR, IT, Finance, Operations)",
  "summary": "2-3 sentence summary of what the employee is requesting",
  "details": {
    "key fields extracted from the request, using policy-specified field names"
  },
  "suggestedApproverRole": "the specific approver role required per policy (e.g. HR Business Partner, Direct Manager, VP of Finance)"
}`;

  const humanPrompt = `Employee request: "${employeeMessage}"`;

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(humanPrompt),
  ]);

  let draft: Record<string, unknown>;
  let department = '';
  try {
    const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
    const cleaned = content.replace(/```json\n?|```\n?/g, '').trim();
    draft = JSON.parse(cleaned);
    department = (draft.department as string) ?? '';
  } catch {
    draft = {
      requestType: 'General HR Request',
      department: 'HR',
      summary: employeeMessage,
      details: {},
      suggestedApproverRole: 'HR Business Partner',
    };
    department = 'HR';
  }

  // Persist draft and inferred department/type onto the Request row
  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'draft',
      type: (draft.requestType as string) ?? 'General HR Request',
      department,
      details: draft as object,
    },
  });

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'createDraft',
      reasoning: `Draft created for request type "${draft.requestType}". Department: ${department}. Suggested approver: ${draft.suggestedApproverRole}.`,
      // Prisma requires a JSON-serializable value; double-serialise to satisfy InputJsonValue typing.
      result: JSON.parse(JSON.stringify(draft)),
    },
  });

  return { draft, department };
}
