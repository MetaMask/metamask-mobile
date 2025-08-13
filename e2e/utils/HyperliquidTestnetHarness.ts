// Use dynamic imports inside functions to avoid Jest ESM issues
const TESTNET = true;

export async function createExchangeClient(privateKey: string) {
  const sdk = await import('@deeeed/hyperliquid-node20');
  const wallet = (
    privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`
  ) as `0x${string}`;
  const transport = new sdk.HttpTransport({ isTestnet: TESTNET });
  return new sdk.ExchangeClient({ wallet, transport, isTestnet: TESTNET });
}

// Simple helpers: seed and read
export async function transferPerps(params: {
  funderPrivateKey: string;
  recipientAddress: string;
  amount: string; // USDC string
}) {
  const { funderPrivateKey, recipientAddress, amount } = params;
  // send spot from funder → recipient
  const funder = await createExchangeClient(funderPrivateKey);
  await funder.usdSend({
    destination: recipientAddress as `0x${string}`,
    amount,
  });
}

export default {
  createExchangeClient,
  transferPerps,
};
