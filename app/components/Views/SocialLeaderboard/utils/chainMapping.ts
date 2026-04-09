import { Hex, CaipChainId } from '@metamask/utils';

/**
 * Maps human-readable chain names (as returned by the Social API)
 * to hex chain IDs used by the Bridge/Swaps system.
 *
 * Solana uses CAIP format instead of hex.
 */
const CHAIN_NAME_TO_ID: Record<string, Hex | CaipChainId> = {
  ethereum: '0x1',
  base: '0x2105',
  arbitrum: '0xa4b1',
  optimism: '0xa',
  polygon: '0x89',
  linea: '0xe708',
  bsc: '0x38',
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

/**
 * Converts a human-readable chain name from the Social API
 * to a chain ID usable by the Bridge/Swaps system.
 *
 * @param chainName - e.g. "base", "ethereum", "solana"
 * @returns Hex chain ID (e.g. "0x2105") or CAIP chain ID for Solana, or undefined if unsupported
 */
export const chainNameToId = (
  chainName: string,
): Hex | CaipChainId | undefined => CHAIN_NAME_TO_ID[chainName.toLowerCase()];

/**
 * Returns true if the chain name maps to a known chain.
 */
export const isSupportedChain = (chainName: string): boolean =>
  chainName.toLowerCase() in CHAIN_NAME_TO_ID;
