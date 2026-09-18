import { Router, Request, Response } from 'express';
import { runSweep } from '../cron/sweep';

const router = Router();

// ---------------------------------------------------------------------------
// POST /api/agent/run
// Manually triggers one sweep cycle (same logic as the cron job).
// Useful for live demos where you don't want to wait for the scheduled minute.
// ---------------------------------------------------------------------------
router.post('/run', async (_req: Request, res: Response): Promise<void> => {
  try {
    const result = await runSweep();
    res.json({
      message: 'Sweep completed.',
      escalated: result.escalated,
      checked: result.checked,
    });
  } catch (err) {
    console.error('[agent/run] Sweep error:', err);
    res.status(500).json({ error: 'Sweep failed. Check server logs.' });
  }
});

export default router;
