import * as cron from 'node-cron';
import { prisma } from '../db/prismaClient';
import { escalateRequest } from '../graph/nodes/escalate';

export interface SweepResult {
  checked: number;
  escalated: number;
}

/**
 * runSweep
 *
 * Finds all requests that have been in `pending_approval` status longer than
 * the configured SLA threshold and escalates each one.
 *
 * SLA_MINUTES env var controls the threshold (default: 2 minutes for demo).
 * For production use, set SLA_MINUTES=60 or higher in your environment.
 *
 * This function is:
 *   1. Called by the node-cron schedule every minute.
 *   2. Exposed via POST /api/agent/run for immediate manual triggers.
 */
export async function runSweep(): Promise<SweepResult> {
  const slaMinutes = parseInt(process.env.SLA_MINUTES ?? '2', 10);
  const slaThreshold = new Date(Date.now() - slaMinutes * 60 * 1000);

  const overdueRequests = await prisma.request.findMany({
    where: {
      status: 'pending_approval',
      updatedAt: { lt: slaThreshold },
    },
    select: { id: true, employeeName: true, updatedAt: true },
  });

  console.log(
    `[sweep] Checked pending requests. SLA: ${slaMinutes}m. Overdue: ${overdueRequests.length}.`
  );

  let escalatedCount = 0;
  for (const req of overdueRequests) {
    try {
      await escalateRequest(req.id);
      escalatedCount++;
    } catch (err) {
      console.error(`[sweep] Failed to escalate request ${req.id}:`, err);
    }
  }

  return { checked: overdueRequests.length, escalated: escalatedCount };
}

/**
 * startCronSweep
 *
 * Registers the cron job that runs runSweep() every minute.
 * Must be called once at server startup (called from server.ts).
 *
 * This is a long-lived process — the cron job persists for the lifetime of the
 * Node.js process. It is NOT serverless-compatible by design; it relies on the
 * process staying alive between invocations.
 */
export function startCronSweep(): void {
  // Runs at the start of every minute: "0 * * * * *" = every minute at :00
  cron.schedule('* * * * *', async () => {
    try {
      await runSweep();
    } catch (err) {
      console.error('[cron] Sweep error:', err);
    }
  });

  console.log('✓ Cron sweep registered (every minute).');
}
