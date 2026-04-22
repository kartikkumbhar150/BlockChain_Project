import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getMintQueue } from '../lib/queue';
import { uploadMetadataToIPFS } from '../services/ipfsService';
import { jwtAuth, apiKeyAuth, AuthRequest } from '../middleware/auth';
import { apiRateLimiter } from '../middleware/rateLimiter';

const router = Router();

const issueSchema = z.object({
  recipientEmail: z.string().email(),
  recipientName: z.string().min(1).max(200),
  recipientWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional(),
  credentialType: z.enum(['Certificate', 'Degree', 'License', 'Badge', 'Other']),
  achievement: z.string().min(1).max(500),
  description: z.string().max(2000).optional(),
  expiresAt: z.string().datetime().optional(),
  customFields: z.record(z.unknown()).optional(),
  templateId: z.string().uuid().optional(),
  sendEmail: z.boolean().default(true),
});

// ── Issue Credential ────────────────────────────────────
router.post('/issue', apiRateLimiter, apiKeyAuth(['credential:issue']), async (req: AuthRequest, res, next) => {
  try {
    const body = issueSchema.parse(req.body);

    const credential = await prisma.credential.create({
      data: {
        institutionId: req.institutionId!,
        recipientEmail: body.recipientEmail,
        recipientName: body.recipientName,
        recipientWallet: body.recipientWallet,
        credentialType: body.credentialType,
        achievement: body.achievement,
        description: body.description,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        customFields: body.customFields || {},
        status: 'PENDING',
        templateId: body.templateId,
      },
    });

    // Upload metadata to IPFS
    const ipfsCid = await uploadMetadataToIPFS({
      recipientName: body.recipientName,
      credentialType: body.credentialType,
      achievement: body.achievement,
      description: body.description || '',
    });

    await prisma.credential.update({
      where: { id: credential.id },
      data: { metadataIpfsCid: ipfsCid },
    });

    // Enqueue mint job (graceful — if Redis is down, credential stays PENDING)
    try {
      const queue = getMintQueue();
      if (queue) {
        await queue.add('mint-credential', { credentialId: credential.id });
      } else {
        console.warn('[Credentials] Redis unavailable, mint job not queued. Credential remains PENDING.');
      }
    } catch (err) {
      console.warn('[Credentials] Failed to enqueue mint job (Redis down?). Credential stays PENDING.');
    }

    res.status(202).json({
      credentialId: credential.id,
      status: 'pending',
      verifyUrl: `${process.env.FRONTEND_URL}/verify/${credential.verificationCode}`,
      estimatedMintTime: '~30s',
    });
  } catch (err) {
    next(err);
  }
});

// ── Issue via Dashboard (JWT auth) ──────────────────────
router.post('/issue-dashboard', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const body = issueSchema.parse(req.body);

    const credential = await prisma.credential.create({
      data: {
        institutionId: req.institutionId!,
        recipientEmail: body.recipientEmail,
        recipientName: body.recipientName,
        recipientWallet: body.recipientWallet,
        credentialType: body.credentialType,
        achievement: body.achievement,
        description: body.description,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        customFields: body.customFields || {},
        status: 'PENDING',
        templateId: body.templateId,
      },
    });

    const ipfsCid = await uploadMetadataToIPFS({
      recipientName: body.recipientName,
      credentialType: body.credentialType,
      achievement: body.achievement,
      description: body.description || '',
    });

    await prisma.credential.update({
      where: { id: credential.id },
      data: { metadataIpfsCid: ipfsCid },
    });

    try {
      const queue = getMintQueue();
      if (queue) {
        await queue.add('mint-credential', { credentialId: credential.id });
      } else {
        console.warn('[Credentials] Redis unavailable, mint job not queued.');
      }
    } catch {
      console.warn('[Credentials] Redis unavailable, mint job not queued.');
    }

    res.status(202).json({
      credentialId: credential.id,
      status: 'pending',
      verifyUrl: `${process.env.FRONTEND_URL}/verify/${credential.verificationCode}`,
      estimatedMintTime: '~30s',
    });
  } catch (err) {
    next(err);
  }
});

// ── List Credentials ────────────────────────────────────
router.get('/', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const { status, page = '1', limit = '20', search } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = { institutionId: req.institutionId! };
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { recipientName: { contains: search, mode: 'insensitive' } },
        { recipientEmail: { contains: search, mode: 'insensitive' } },
        { achievement: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.credential.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.credential.count({ where }),
    ]);

    res.json({ data, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
});

// ── Get Credential by ID ────────────────────────────────
router.get('/:id', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const credential = await prisma.credential.findFirst({
      where: { id: req.params.id, institutionId: req.institutionId! },
      include: { verificationEvents: { orderBy: { verifiedAt: 'desc' }, take: 20 } },
    });
    if (!credential) return res.status(404).json({ error: 'Credential not found' });
    res.json(credential);
  } catch (err) {
    next(err);
  }
});

// ── Revoke Credential ───────────────────────────────────
const revokeSchema = z.object({ reason: z.string().min(1) });

router.post('/:id/revoke', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const { reason } = revokeSchema.parse(req.body);
    const credential = await prisma.credential.updateMany({
      where: { id: req.params.id, institutionId: req.institutionId! },
      data: { status: 'REVOKED' },
    });
    if (credential.count === 0) return res.status(404).json({ error: 'Credential not found' });
    res.json({ revokedAt: new Date().toISOString(), reason });
  } catch (err) {
    next(err);
  }
});

// ── Dashboard Stats ─────────────────────────────────────
router.get('/stats/overview', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const instId = req.institutionId!;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [total, monthCount, verifyToday, statusCounts] = await Promise.all([
      prisma.credential.count({ where: { institutionId: instId } }),
      prisma.credential.count({ where: { institutionId: instId, createdAt: { gte: startOfMonth } } }),
      prisma.verificationEvent.count({
        where: {
          credential: { institutionId: instId },
          verifiedAt: { gte: new Date(now.toDateString()) },
        },
      }),
      prisma.credential.groupBy({
        by: ['status'],
        where: { institutionId: instId },
        _count: true,
      }),
    ]);

    res.json({ total, issuedThisMonth: monthCount, verificationsToday: verifyToday, statusCounts });
  } catch (err) {
    next(err);
  }
});

export { router as credentialsRouter };
