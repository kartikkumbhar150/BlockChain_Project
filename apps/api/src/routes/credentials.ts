import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { uploadMetadataToIPFS } from '../services/ipfsService';
import './workers/mintWorker';

const credentialsRouter = Router();
const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
const mintQueue = new Queue('mint-queue', { connection: redisConnection });

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
  // For the sake of this test implementation without Auth Middleware,
  // we'll pass the institution ID explicitly as a hack:
  _institutionId: z.string().uuid()
});

credentialsRouter.post('/issue', async (req, res, next) => {
  try {
    const body = issueSchema.parse(req.body);
    
    // In real app, `req.institution` comes from API Key Auth Middleware
    const institution = await prisma.institution.findUniqueOrThrow({
      where: { id: body._institutionId }
    });

    const credential = await prisma.credential.create({
      data: {
        institutionId: institution.id,
        recipientEmail: body.recipientEmail,
        recipientName: body.recipientName,
        recipientWallet: body.recipientWallet,
        credentialType: body.credentialType,
        achievement: body.achievement,
        description: body.description,
        expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        customFields: body.customFields || {},
        status: 'PENDING',
        templateId: body.templateId
      }
    });

    // Upload to IPFS asynchronously or synchronously. Sync is easier for mapping CID:
    const ipfsCid = await uploadMetadataToIPFS({
      recipientName: body.recipientName,
      credentialType: body.credentialType,
      achievement: body.achievement,
      description: body.description || ""
    });

    // Update with CID
    await prisma.credential.update({
      where: { id: credential.id },
      data: { metadataIpfsCid: ipfsCid }
    });

    // Enqueue mint job
    await mintQueue.add('mint-credential', {
      credentialId: credential.id
    });

    res.status(202).json({
      credentialId: credential.id,
      status: 'pending',
      verifyUrl: `${process.env.FRONTEND_URL}/verify/${credential.verificationCode}`,
      estimatedMintTime: '~30s'
    });
  } catch (err) {
    next(err);
  }
});

export { credentialsRouter };
