import { ethers } from 'ethers';

/**
 * Retrieves institution wallet. In dev mode, uses PRIVATE_KEY env var.
 * In production, fetches from AWS Secrets Manager.
 */
export async function getInstitutionWallet(secretArn: string): Promise<ethers.Wallet> {
  if (!secretArn) throw new Error('Institution wallet configuration missing');

  // Dev mode shortcut
  if (process.env.NODE_ENV === 'development' && process.env.PRIVATE_KEY) {
    return new ethers.Wallet(process.env.PRIVATE_KEY);
  }

  // Production: AWS Secrets Manager
  const { SecretsManagerClient, GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager');
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const secret = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));

  if (!secret.SecretString) throw new Error('Secret string empty');
  const { privateKey } = JSON.parse(secret.SecretString);
  return new ethers.Wallet(privateKey);
}

/**
 * Creates a brand new random EVM wallet for an institution.
 */
export async function createInstitutionWallet() {
  const wallet = ethers.Wallet.createRandom();
  const secretArn = `mock-arn-for-wallet-${wallet.address}`;
  return { address: wallet.address, secretArn };
}
