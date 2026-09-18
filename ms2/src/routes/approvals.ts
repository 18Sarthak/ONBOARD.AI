import { Router, Request, Response } from 'express';
import { prisma } from '../db/prismaClient';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/approvals?requestId=<uuid>
// Returns all approval records for a given request, newest first.
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.query;

  if (!requestId || typeof requestId !== 'string') {
    res.status(400).json({ error: 'requestId query parameter is required.' });
    return;
  }

  const request = await prisma.request.findUnique({ where: { id: requestId } });
  if (!request) {
    res.status(404).json({ error: `Request ${requestId} not found.` });
    return;
  }

  const approvals = await prisma.agentApproval.findMany({
    where: { requestId },
    orderBy: { decidedAt: 'desc' },
  });

  res.json({ requestId, approvals });
});

export default router;
