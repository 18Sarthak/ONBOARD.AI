import { interrupt } from '@langchain/langgraph';
import { GraphState } from '../graph';
import { prisma } from '../../db/prismaClient';

/**
 * Node: routeForApproval
 *
 * 1. Reads the approver role determined in `createDraft` from state.
 * 2. Creates (or updates) an AgentApproval row with decision=pending.
 * 3. Updates Request.status → pending_approval.
 * 4. Calls LangGraph's `interrupt()` to suspend execution here.
 *    The server will resume this graph via:
 *      graph.invoke(new Command({ resume: { decision, approverRole } }), config)
 *    when the human calls POST /api/requests/:id/approve or /reject.
 *
 * After resume:
 * - Returns { approvalStatus: 'approved' | 'rejected' } so the conditional
 *   edge in graph.ts can route to `close` or back to `checkMissingInfo`.
 *
 * Writes two AgentLog rows: one before interrupt (routing decision),
 * one after resume (human decision received).
 */
export async function routeForApproval(
  state: typeof GraphState.State
): Promise<Partial<typeof GraphState.State>> {
  const { requestId, draft, department } = state;

  // Determine approver role from draft (set by createDraft node)
  const approverRole =
    (draft?.suggestedApproverRole as string) ?? 'HR Business Partner';
  const resolvedDept = department || (draft?.department as string) || 'HR';

  // Create the Approval record
  await prisma.agentApproval.create({
    data: {
      requestId,
      approverRole,
      decision: 'pending',
    },
  });

  // Update request status
  await prisma.request.update({
    where: { id: requestId },
    data: {
      status: 'pending_approval',
      department: resolvedDept,
    },
  });

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'routeForApproval',
      reasoning: `Request routed to ${approverRole} (${resolvedDept}) for approval. Graph execution suspended — waiting for human decision via POST /api/requests/${requestId}/approve or /reject.`,
      result: { approverRole, department: resolvedDept, status: 'pending_approval' },
    },
  });

  // -------------------------------------------------------------------------
  // Suspend execution and wait for a human to call approve/reject.
  // interrupt() saves state to the PostgresSaver checkpointer and throws a
  // special interrupt signal. The graph will resume when invoked again with
  // Command({ resume: <value> }).
  // -------------------------------------------------------------------------
  const humanDecision = interrupt({
    message: 'Waiting for human approval',
    requestId,
    approverRole,
  }) as { decision: 'approved' | 'rejected'; approverRole: string; reason?: string };

  // Execution resumes here after the human calls approve/reject ---------
  const { decision, approverRole: decidedByRole, reason } = humanDecision;

  // Update the Approval record with the final decision
  await prisma.agentApproval.updateMany({
    where: { requestId, decision: 'pending' },
    data: {
      decision,
      decidedAt: new Date(),
      approverRole: decidedByRole ?? approverRole,
      reason: reason ?? null,
    },
  });

  if (decision === 'approved') {
    await prisma.request.update({
      where: { id: requestId },
      data: { status: 'approved' },
    });
  }

  await prisma.agentLog.create({
    data: {
      requestId,
      nodeName: 'routeForApproval',
      reasoning: `Human decision received: ${decision}${reason ? ` — Reason: "${reason}"` : ''}. Decided by: ${decidedByRole ?? approverRole}.`,
      result: { decision, decidedByRole: decidedByRole ?? approverRole, reason: reason ?? null },
    },
  });

  return { approvalStatus: decision };
}
