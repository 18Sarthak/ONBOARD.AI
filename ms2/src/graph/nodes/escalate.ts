import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { prisma } from '../../db/prismaClient';

const llm = new ChatGroq({
  model: 'groq/compound',
  temperature: 0.3,
});

/**
 * escalateRequest
 *
 * Standalone function (NOT a graph node in the main flow) called by the
 * cron sweep when a request has been sitting in `pending_approval` longer
 * than the configured SLA threshold.
 *
 * Design rationale: The graph is already suspended at `interrupt()` inside
 * `routeForApproval`. Resuming just to escalate would consume the interrupt
 * slot and force the graph to close. Instead, we perform the escalation
 * as a direct DB operation + LLM summary and leave the graph thread dormant.
 *
 * SLA threshold is configured via SLA_MINUTES env var (default: 2 minutes for
 * demo purposes — set to 60–480 in production to reflect real SLAs).
 *
 * @param requestId  The ID of the request to escalate.
 */
export async function escalateRequest(requestId: string): Promise<void> {
  // Fetch the request for context
  const request = await prisma.request.findUnique({
    where: { id: requestId },
    include: { approvals: true },
  });

  if (!request) {
    console.warn(`[escalate] Request ${requestId} not found — skipping.`);
    return;
  }

  // Skip if already escalated or done (idempotency)
  if (request.status === 'escalated' || request.status === 'done') {
    return;
  }

  const pendingApproval = request.approvals.find((a) => a.decision === 'pending');
  const approverRole = pendingApproval?.approverRole ?? 'HR Business Partner';

  const minutesElapsed = Math.round(
    (Date.now() - request.updatedAt.getTime()) / 60_000
  );

  // Ask the LLM for a short escalation summary
  let escalationReason = `Request sat in pending_approval for ${minutesElapsed} minute(s) without a response from ${approverRole}.`;

  try {
    const response = await llm.invoke([
      new SystemMessage(
        'You are an HR escalation assistant. Write a 1-2 sentence escalation notice for a manager.'
      ),
      new HumanMessage(
        `HR request from ${request.employeeName} (type: ${request.type}) has been waiting for approval by ${approverRole} for ${minutesElapsed} minute(s) and has exceeded the SLA threshold. Write a brief escalation notice.`
      ),
    ]);
    escalationReason =
      typeof response.content === 'string'
        ? response.content
        : escalationReason;
  } catch (err) {
    // LLM failure should not prevent escalation from completing
    console.warn('[escalate] LLM call failed, using default reasoning:', err);
  }

  // Update request status
  await prisma.request.update({
    where: { id: requestId },
    data: { status: 'escalated' },
  });

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'escalate',
      reasoning: escalationReason,
      result: {
        previousStatus: 'pending_approval',
        approverRole,
        minutesElapsed,
        slaCrossedAt: new Date().toISOString(),
      },
    },
  });

  console.log(`[escalate] Request ${requestId} escalated after ${minutesElapsed}m.`);
}
