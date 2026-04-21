import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { jwtAuth, AuthRequest } from '../middleware/auth';

const router = Router();

// ── Get My Institution ──────────────────────────────────
router.get('/me', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const institution = await prisma.institution.findUnique({
      where: { id: req.institutionId! },
      include: {
        _count: { select: { credentials: true, apiKeys: true, users: true, templates: true } },
      },
    });
    if (!institution) return res.status(404).json({ error: 'Institution not found' });
    res.json(institution);
  } catch (err) {
    next(err);
  }
});

// ── Update My Institution ───────────────────────────────
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  webhookUrl: z.string().url().optional().nullable(),
  webhookSecret: z.string().optional().nullable(),
});

router.put('/me', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const body = updateSchema.parse(req.body);
    const institution = await prisma.institution.update({
      where: { id: req.institutionId! },
      data: body,
    });
    res.json(institution);
  } catch (err) {
    next(err);
  }
});

// ── Usage Stats ─────────────────────────────────────────
router.get('/me/usage', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const instId = req.institutionId!;
    const institution = await prisma.institution.findUnique({ where: { id: instId } });
    const totalCredentials = await prisma.credential.count({ where: { institutionId: instId } });

    const planLimits: Record<string, number> = {
      STARTER: 500,
      PROFESSIONAL: 5000,
      ENTERPRISE: 999999,
    };
    const limit = planLimits[institution?.plan || 'STARTER'];

    res.json({
      plan: institution?.plan,
      used: totalCredentials,
      limit,
      percentUsed: Math.round((totalCredentials / limit) * 100),
    });
  } catch (err) {
    next(err);
  }
});

export { router as institutionsRouter };
