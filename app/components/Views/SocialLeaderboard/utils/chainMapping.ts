import type { CaipChainId, Hex } from '@metamask/utils';

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

export const chainNameToId = (
  chainName: string,
): Hex | CaipChainId | undefined => CHAIN_NAME_TO_ID[chainName.toLowerCase()];

export const isSupportedChain = (chainName: string): boolean =>
  chainName.toLowerCase() in CHAIN_NAME_TO_ID;
