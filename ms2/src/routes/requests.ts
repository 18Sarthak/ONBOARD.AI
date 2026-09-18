import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../db/prismaClient';
import { getCompiledGraph, Command } from '../graph/graph';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/requests
// Body: { employeeName: string, message: string }
// Creates a Request row and fires the LangGraph agent asynchronously.
// Returns immediately with { requestId }.
// ---------------------------------------------------------------------------
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { employeeName, message } = req.body ?? {};

  if (!employeeName || typeof employeeName !== 'string' || !employeeName.trim()) {
    res.status(400).json({ error: 'employeeName is required.' });
    return;
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({ error: 'message is required.' });
    return;
  }

  const requestId = uuidv4();

  await prisma.request.create({
    data: {
      id: requestId,
      employeeName: employeeName.trim(),
      status: 'draft',
    },
  });

  // Fire-and-forget: run the graph in the background so the HTTP response
  // returns immediately. The caller polls GET /api/requests/:id for status.
  const graph = getCompiledGraph();
  const threadConfig = { configurable: { thread_id: requestId } };
  const initialState = {
    requestId,
    employeeMessage: message.trim(),
  };

  setImmediate(async () => {
    try {
      await graph.invoke(initialState, threadConfig);
    } catch (err: unknown) {
      // LangGraph raises an interrupt signal as an error-like object when the
      // graph suspends at routeForApproval. This is expected behaviour —
      // it means the graph has saved its state to Postgres and is waiting for
      // the human to call approve/reject.
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes('interrupt') ||
        errorMessage.includes('Interrupt') ||
        errorMessage.includes('GraphInterrupt')
      ) {
        // Normal pause — do nothing
      } else {
        console.error(`[graph] Unhandled error for request ${requestId}:`, err);
      }
    }
  });

  res.status(201).json({ requestId });
});

// ---------------------------------------------------------------------------
// GET /api/requests/:id
// Returns full request state, latest approval, and most recent log entry.
// ---------------------------------------------------------------------------
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      approvals: { orderBy: { decidedAt: 'desc' } },
      logs: { orderBy: { timestamp: 'desc' }, take: 1 },
    },
  });

  if (!request) {
    res.status(404).json({ error: `Request ${id} not found.` });
    return;
  }

  res.json({
    id: request.id,
    employeeName: request.employeeName,
    type: request.type,
    status: request.status,
    department: request.department,
    details: request.details,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    latestApproval: request.approvals[0] ?? null,
    latestLog: request.logs[0] ?? null,
  });
});

// ---------------------------------------------------------------------------
// POST /api/requests/:id/approve
// Body: { approverRole: string }
// Resumes the interrupted graph with an approved decision.
// ---------------------------------------------------------------------------
router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { approverRole } = req.body ?? {};

  if (!approverRole || typeof approverRole !== 'string') {
    res.status(400).json({ error: 'approverRole is required.' });
    return;
  }

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) {
    res.status(404).json({ error: `Request ${id} not found.` });
    return;
  }

  if (request.status !== 'pending_approval') {
    res.status(400).json({
      error: `Request is in status "${request.status}" and cannot be approved. Expected "pending_approval".`,
    });
    return;
  }

  const graph = getCompiledGraph();
  const threadConfig = { configurable: { thread_id: id } };

  // Resume the interrupted graph with the approval decision.
  setImmediate(async () => {
    try {
      await graph.invoke(
        new Command({ resume: { decision: 'approved', approverRole } }),
        threadConfig
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('interrupt') && !errorMessage.includes('Interrupt')) {
        console.error(`[approve] Unhandled error for request ${id}:`, err);
      }
    }
  });

  res.json({ message: 'Approval submitted. Graph resuming.', requestId: id });
});

// ---------------------------------------------------------------------------
// POST /api/requests/:id/reject
// Body: { approverRole: string, reason?: string }
// Resumes the interrupted graph with a rejected decision.
// Graph will route back to checkMissingInfo.
// ---------------------------------------------------------------------------
router.post('/:id/reject', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const { approverRole, reason } = req.body ?? {};

  if (!approverRole || typeof approverRole !== 'string') {
    res.status(400).json({ error: 'approverRole is required.' });
    return;
  }

  const request = await prisma.request.findUnique({ where: { id } });
  if (!request) {
    res.status(404).json({ error: `Request ${id} not found.` });
    return;
  }

  if (request.status !== 'pending_approval') {
    res.status(400).json({
      error: `Request is in status "${request.status}" and cannot be rejected. Expected "pending_approval".`,
    });
    return;
  }

  const graph = getCompiledGraph();
  const threadConfig = { configurable: { thread_id: id } };

  setImmediate(async () => {
    try {
      await graph.invoke(
        new Command({ resume: { decision: 'rejected', approverRole, reason: reason ?? '' } }),
        threadConfig
      );
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (!errorMessage.includes('interrupt') && !errorMessage.includes('Interrupt')) {
        console.error(`[reject] Unhandled error for request ${id}:`, err);
      }
    }
  });

  res.json({ message: 'Rejection submitted. Graph resuming.', requestId: id });
});

export default router;
