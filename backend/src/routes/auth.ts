import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { jwtAuth, AuthRequest } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ── Register ────────────────────────────────────────────
const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  institutionName: z.string().min(1),
  domain: z.string().min(1),
});

router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const body = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 12);

    // Create institution + first admin user in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const institution = await tx.institution.create({
        data: {
          name: body.institutionName,
          domain: body.domain,
        },
      });

      const user = await tx.institutionUser.create({
        data: {
          institutionId: institution.id,
          email: body.email,
          passwordHash,
          role: 'admin',
        },
      });

      return { institution, user };
    });

    const token = jwt.sign(
      { userId: result.user.id, institutionId: result.institution.id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      institutionId: result.institution.id,
      token,
    });
  } catch (err: any) {
    if (err?.code === 'P2002') {
      return res.status(409).json({ error: 'Domain or email already registered' });
    }
    next(err);
  }
});

// ── Login ───────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const body = loginSchema.parse(req.body);

    const user = await prisma.institutionUser.findFirst({
      where: { email: body.email },
      include: { institution: true },
    });

    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { userId: user.id, institutionId: user.institutionId },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      institution: {
        id: user.institution.id,
        name: user.institution.name,
        domain: user.institution.domain,
        plan: user.institution.plan,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ── Create API Key ──────────────────────────────────────
const createKeySchema = z.object({
  label: z.string().min(1),
  scopes: z.array(z.string()).min(1),
  expiresAt: z.string().datetime().optional(),
});

router.post('/api-keys', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const body = createKeySchema.parse(req.body);
    const rawKey = `sk_live_${crypto.randomUUID().replace(/-/g, '')}`;
    const keyHash = await bcrypt.hash(rawKey, 10);

    const apiKey = await prisma.apiKey.create({
      data: {
        institutionId: req.institutionId!,
        keyHash,
        label: body.label,
        scopes: body.scopes,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      },
    });

    // Return raw key ONCE — it can never be retrieved again
    res.status(201).json({
      keyId: apiKey.id,
      key: rawKey,
      label: apiKey.label,
      scopes: apiKey.scopes,
    });
  } catch (err) {
    next(err);
  }
});

// ── List API Keys ───────────────────────────────────────
router.get('/api-keys', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { institutionId: req.institutionId! },
      select: {
        id: true,
        label: true,
        scopes: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
    });
    res.json(keys);
  } catch (err) {
    next(err);
  }
});

// ── Delete API Key ──────────────────────────────────────
router.delete('/api-keys/:keyId', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    await prisma.apiKey.deleteMany({
      where: {
        id: req.params.keyId,
        institutionId: req.institutionId!,
      },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ── Get Current User ────────────────────────────────────
router.get('/me', jwtAuth, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.institutionUser.findUnique({
      where: { id: req.userId! },
      include: { institution: true },
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      institution: {
        id: user.institution.id,
        name: user.institution.name,
        domain: user.institution.domain,
        plan: user.institution.plan,
        contractAddress: user.institution.contractAddress,
        walletAddress: user.institution.walletAddress,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as authRouter };
