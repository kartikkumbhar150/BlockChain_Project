import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { ethers } from 'ethers';

/**
 * Retrieves the institution's wallet by fetching their private key securely 
 * from AWS Secrets Manager.
 */
export async function getInstitutionWallet(secretArn: string): Promise<ethers.Wallet> {
  // If no ARN is provided, throw error
  if (!secretArn) throw new Error("Institution wallet configuration missing");

  // In local/dev, you might just bypass AWS and use an ENV setup
  if (process.env.NODE_ENV === 'development' && process.env.PRIVATE_KEY) {
    return new ethers.Wallet(process.env.PRIVATE_KEY);
  }

  const client = new SecretsManagerClient({ region: 'us-east-1' });
  const secret = await client.send(new GetSecretValueCommand({ SecretId: secretArn }));
  
  if (!secret.SecretString) throw new Error("Secret string empty");
  
  const { privateKey } = JSON.parse(secret.SecretString);
  return new ethers.Wallet(privateKey);
}

/**
 * Creates a brand new random EVM Custodial Wallet for Institutions
 */
export async function createInstitutionWallet() {
  const wallet = ethers.Wallet.createRandom();
  
  // TODO: Implement actual AWS Secrets Manager storage
  // return secret ARN 
  const secretArn = `mock-arn-for-wallet-${wallet.address}`;

  return {
    address: wallet.address,
    secretArn
  };
}
