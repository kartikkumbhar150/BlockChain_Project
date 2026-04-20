import { Worker, Job } from 'bullmq';
import { ethers } from 'ethers';
import { prisma } from '../lib/prisma';
import { getInstitutionWallet } from '../services/walletService';
import CredentialSBT from '../../../../packages/contracts/artifacts/contracts/CredentialSBT.sol/CredentialSBT.json';
// Or if artifacts are not ready, import ABI directly:
// const ABI = CredentialSBT.abi;

const redisConnection = {
  host: "localhost",
  port: 6379,
  // Add auth/tls config if using Upstash in prod
};

export const mintWorker = new Worker('mint-queue', async (job: Job) => {
  const { credentialId } = job.data;
  console.log(`[Worker] Processing Job ID: ${job.id} for Credential ID: ${credentialId}`);

  // Fetch credential
  const credential = await prisma.credential.findUniqueOrThrow({
    where: { id: credentialId },
    include: { institution: true }
  });

  // Start minting status
  await prisma.credential.update({
    where: { id: credentialId },
    data: { status: 'MINTING' }
  });

  try {
    // Determine the network URL
    const providerUrl = process.env.POLYGON_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology/";
    const provider = new ethers.JsonRpcProvider(providerUrl);

    // Load Institution's wallet
    let wallet;
    try {
      wallet = await getInstitutionWallet(credential.institution.walletKeyRef || "");
    } catch (err: any) {
      throw new Error(`Failed to initialize wallet: ${err.message}`);
    }
    const signer = wallet.connect(provider);

    // Validate Contract mapping
    if (!credential.institution.contractAddress) {
      throw new Error("Institution does not have a deployed contract string");
    }

    const contract = new ethers.Contract(
      credential.institution.contractAddress,
      CredentialSBT.abi,
      signer
    );

    const recipientAddress = credential.recipientWallet || "0x0000000000000000000000000000000000000000"; 
    // ^ In a real world scenario, you'd mint to platform custodial wallet if not provided

    console.log(`[Worker] Preparing mint transaction onto ${credential.institution.contractAddress}...`);
    
    // Gas estimations and overrides can go here
    const tx = await contract.mint(
      recipientAddress,
      {
        recipientName: credential.recipientName,
        credentialType: credential.credentialType,
        achievement: credential.achievement,
        issuedAt: Math.floor(new Date(credential.issuedAt).getTime() / 1000),
        expiresAt: credential.expiresAt
          ? Math.floor(new Date(credential.expiresAt).getTime() / 1000) : 0,
        metadataURI: `${credential.metadataIpfsCid}`, // CID
        batchId: credential.batchId
          ? ethers.encodeBytes32String(credential.batchId) : ethers.ZeroHash
      }
    );

    console.log(`[Worker] Transaction submitted: ${tx.hash}. Waiting for receipt...`);
    const receipt = await tx.wait();

    console.log(`[Worker] Transaction confirmed in block: ${receipt.blockNumber}`);
    
    // Parse the event log to find the tokenId (simple assumption: tokenId is topics[1] generally for standard ERC721 Issue event)
    // Note: OpenZeppelin ERC721 Transfer event is emitted alongside: Transfer(address indexed from, address indexed to, uint256 indexed tokenId)
    const tokenId = BigInt(0); // Mock parsing for safely moving forward

    // Update DB with success
    await prisma.credential.update({
      where: { id: credentialId },
      data: { 
          status: 'MINTED', 
          txHash: receipt.hash, 
          // tokenId: tokenId 
      }
    });

    console.log(`[Worker] Completed credential ${credentialId}.`);
    
    // POST-MINT tasks:
    // await notificationService.sendRecipientEmail(credential);
    // await webhookService.fire(credential.institution, 'credential.minted', credential);

  } catch (error: any) {
    console.error(`[Worker] Mint failed for credential ${credentialId}:`, error);

    await prisma.credential.update({
      where: { id: credentialId },
      data: { status: 'FAILED' }
    });

    throw error; // Let BullMQ handle failure tracking
  }

}, { connection: redisConnection, concurrency: 5 });

mintWorker.on('failed', (job, err) => {
  console.error(`BullMQ Worker Failed for Job ${job?.id}:`, err);
});
