/**
 * Blockchain utilities for Hyperliquid network explorer URLs
 */

/**
 * Gets the full Hyperliquid explorer URL for an address
 * @param network - Either "mainnet" or "testnet"
 * @param address - The address to view in the explorer
 * @returns The full explorer URL
 */
export const getHyperliquidExplorerUrl = (
  network: 'mainnet' | 'testnet',
  address: string,
): string => {
  const baseUrl =
    network === 'testnet'
      ? 'https://app.hyperliquid-testnet.xyz'
      : 'https://app.hyperliquid.xyz';

  return `${baseUrl}/explorer/address/${address}`;
};
