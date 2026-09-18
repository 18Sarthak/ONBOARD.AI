import { Router, Request, Response } from 'express';
import { prisma } from '../db/prismaClient';

const router = Router();

// ---------------------------------------------------------------------------
// GET /api/logs?requestId=<uuid>
// Returns AgentLog rows ordered by timestamp DESC.
// requestId is optional — omitting it returns all logs (useful for admin views).
// ---------------------------------------------------------------------------
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const { requestId } = req.query;

  const where =
    requestId && typeof requestId === 'string'
      ? { requestId }
      : {};

  const logs = await prisma.agentLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
  });

  res.json({ logs });
});

export default router;
