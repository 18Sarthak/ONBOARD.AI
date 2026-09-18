import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { GraphState } from '../graph';
import { prisma } from '../../db/prismaClient';

const llm = new ChatGroq({
  model: 'groq/compound',
  temperature: 0.3,
});

/**
 * Node: close
 *
 * Final node in the happy path. Called after the human approves a request.
 *
 * 1. Marks Request.status → done.
 * 2. Uses the LLM to write a brief final summary (for the dashboard/audit log).
 * 3. Writes a final AgentLog row with the summary.
 */
export async function close(
  state: typeof GraphState.State
): Promise<Partial<typeof GraphState.State>> {
  const { requestId, employeeMessage, draft, department } = state;

  const requestType = (draft?.requestType as string) ?? 'HR Request';
  const approverRole = (draft?.suggestedApproverRole as string) ?? 'approver';

  let summary = `Request "${requestType}" for "${employeeMessage}" was approved by ${approverRole} and is now complete.`;

  try {
    const response = await llm.invoke([
      new SystemMessage(
        'You are an HR workflow assistant. Write a concise 2-3 sentence completion summary for an approved HR request. Be professional and informative.'
      ),
      new HumanMessage(
        `Request type: ${requestType}\nEmployee message: "${employeeMessage}"\nDepartment: ${department}\nApproved by: ${approverRole}\n\nWrite the completion summary.`
      ),
    ]);
    summary =
      typeof response.content === 'string' ? response.content : summary;
  } catch (err) {
    console.warn('[close] LLM summary failed, using default:', err);
  }

  await prisma.request.update({
    where: { id: requestId },
    data: { status: 'done' },
  });

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'close',
      reasoning: summary,
      result: {
        finalStatus: 'done',
        requestType,
        approvedBy: approverRole,
        completedAt: new Date().toISOString(),
      },
    },
  });

  return {};
}
