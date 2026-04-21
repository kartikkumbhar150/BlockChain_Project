import { Worker, Job } from 'bullmq';
import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { getInstitutionWallet } from '../services/walletService';
import { getRedis } from '../lib/queue';

// Start worker only if Redis is available
let workerStarted = false;

export function startMintWorker() {
  if (workerStarted) return;

  try {
    const connection = getRedis();

    const worker = new Worker('mint-queue', async (job: Job) => {
      const { credentialId } = job.data;
      console.log(`[MintWorker] Processing credential ${credentialId}`);

      const credential = await prisma.credential.findUniqueOrThrow({
        where: { id: credentialId },
        include: { institution: true },
      });

      await prisma.credential.update({
        where: { id: credentialId },
        data: { status: 'MINTING' },
      });

      try {
        const providerUrl = process.env.POLYGON_AMOY_RPC_URL || 'https://rpc-amoy.polygon.technology/';
        const provider = new ethers.JsonRpcProvider(providerUrl);

        const wallet = await getInstitutionWallet(credential.institution.walletKeyRef || '');
        const signer = wallet.connect(provider);

        if (!credential.institution.contractAddress) {
          throw new Error('Institution has no deployed contract');
        }

        // Simplified ABI for the mint function
        const abi = [
          'function mint(address recipient, tuple(string recipientName, string credentialType, string achievement, uint256 issuedAt, uint256 expiresAt, string metadataURI, bytes32 batchId) data) returns (uint256)',
        ];

        const contract = new ethers.Contract(credential.institution.contractAddress, abi, signer);

        const tx = await contract.mint(
          credential.recipientWallet || ethers.ZeroAddress,
          {
            recipientName: credential.recipientName,
            credentialType: credential.credentialType,
            achievement: credential.achievement,
            issuedAt: Math.floor(new Date(credential.issuedAt).getTime() / 1000),
            expiresAt: credential.expiresAt
              ? Math.floor(new Date(credential.expiresAt).getTime() / 1000)
              : 0,
            metadataURI: credential.metadataIpfsCid || '',
            batchId: credential.batchId
              ? ethers.encodeBytes32String(credential.batchId)
              : ethers.ZeroHash,
          }
        );

        console.log(`[MintWorker] TX submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`[MintWorker] TX confirmed block ${receipt.blockNumber}`);

        await prisma.credential.update({
          where: { id: credentialId },
          data: { status: 'MINTED', txHash: receipt.hash },
        });

        console.log(`[MintWorker] Credential ${credentialId} minted successfully`);
      } catch (error: any) {
        console.error(`[MintWorker] Mint failed: ${error.message}`);
        await prisma.credential.update({
          where: { id: credentialId },
          data: { status: 'FAILED' },
        });
        throw error;
      }
    }, { connection, concurrency: 5 });

    worker.on('failed', (job, err) => {
      console.error(`[MintWorker] Job ${job?.id} failed:`, err.message);
    });

    workerStarted = true;
    console.log('[MintWorker] Started and listening for jobs');
  } catch (err: any) {
    console.warn(`[MintWorker] Could not start (Redis down?): ${err.message}`);
  }
}
