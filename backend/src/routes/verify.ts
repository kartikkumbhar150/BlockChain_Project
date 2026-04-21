import { Router } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// ── Public Verify ───────────────────────────────────────
router.get('/verify/:verificationCode', async (req, res, next) => {
  try {
    const { verificationCode } = req.params;

    const credential = await prisma.credential.findUnique({
      where: { verificationCode },
      include: { institution: true },
    });

    if (!credential) {
      return res.status(404).json({ valid: false, error: 'Credential not found' });
    }

    let valid = true;
    if (credential.status === 'REVOKED') valid = false;
    if (credential.status === 'FAILED') valid = false;
    if (credential.expiresAt && new Date() > credential.expiresAt) valid = false;

    // Log verification event asynchronously
    prisma.verificationEvent.create({
      data: {
        credentialId: credential.id,
        verifiedByIp: req.ip || 'unknown',
        source: (req.query.source as string) || 'link',
      },
    }).catch((err) => console.error('Failed to log verification event', err));

    res.json({
      valid,
      credential: {
        institutionName: credential.institution.name,
        recipientName: credential.recipientName,
        credentialType: credential.credentialType,
        achievement: credential.achievement,
        description: credential.description,
        issuedAt: credential.issuedAt,
        expiresAt: credential.expiresAt,
        status: credential.status,
        tokenId: credential.tokenId ? credential.tokenId.toString() : null,
        contractAddress: credential.institution.contractAddress,
        chainExplorerUrl: credential.txHash
          ? `https://amoy.polygonscan.com/tx/${credential.txHash}`
          : null,
        ipfsMetadataUrl: credential.metadataIpfsCid
          ? `https://ipfs.io/ipfs/${credential.metadataIpfsCid}`
          : null,
        imageUrl: credential.imageIpfsCid
          ? `https://ipfs.io/ipfs/${credential.imageIpfsCid}`
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

export { router as verifyRouter };
