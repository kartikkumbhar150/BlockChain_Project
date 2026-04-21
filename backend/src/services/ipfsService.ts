export async function uploadMetadataToIPFS(metadata: Record<string, unknown>): Promise<string> {
  const PINATA_API_KEY = process.env.PINATA_API_KEY;
  const PINATA_API_SECRET = process.env.PINATA_API_SECRET;

  if (!PINATA_API_KEY || !PINATA_API_SECRET) {
    console.warn('[IPFS] Pinata keys missing — returning mock CID');
    return 'QmMockCIDForDevelopmentTestOnly1234567890ABCDEF';
  }

  const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
    method: 'POST',
    headers: {
      pinata_api_key: PINATA_API_KEY,
      pinata_secret_api_key: PINATA_API_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: { name: `credential-metadata-${Date.now()}.json` },
    }),
  });

  if (!response.ok) {
    throw new Error(`Pinata upload failed: ${await response.text()}`);
  }

  const data = await response.json();
  return data.IpfsHash;
}
