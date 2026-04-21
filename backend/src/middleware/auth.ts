import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

export interface AuthRequest extends Request {
  userId?: string;
  institutionId?: string;
}

/**
 * Bearer JWT auth for dashboard routes.
 * Attaches userId and institutionId to request.
 */
export function jwtAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; institutionId: string };
    req.userId = payload.userId;
    req.institutionId = payload.institutionId;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * API Key auth for programmatic access.
 * Reads X-API-Key header, hashes it, looks up in DB.
 */
export function apiKeyAuth(requiredScopes: string[] = []) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing X-API-Key header' });
    }

    try {
      const bcrypt = await import('bcryptjs');
      // For performance, we look up all keys for now.
      // In production, use a prefix-based lookup.
      const allKeys = await prisma.apiKey.findMany({
        include: { institution: true },
      });

      let matchedKey = null;
      for (const k of allKeys) {
        if (await bcrypt.compare(apiKey, k.keyHash)) {
          matchedKey = k;
          break;
        }
      }

      if (!matchedKey) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      // Check expiry
      if (matchedKey.expiresAt && new Date() > matchedKey.expiresAt) {
        return res.status(401).json({ error: 'API key expired' });
      }

      // Check scopes
      if (requiredScopes.length > 0) {
        const hasScope = requiredScopes.every((s) => matchedKey!.scopes.includes(s));
        if (!hasScope) {
          return res.status(403).json({ error: 'Insufficient scope' });
        }
      }

      // Attach institution
      req.institutionId = matchedKey.institutionId;

      // Update last used
      prisma.apiKey.update({
        where: { id: matchedKey.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {}); // fire and forget

      next();
    } catch (err) {
      next(err);
    }
  };
}
