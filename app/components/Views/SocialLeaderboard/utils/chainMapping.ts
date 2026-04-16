import type { CaipChainId } from '@metamask/utils';

const CHAIN_NAME_TO_ID: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
  base: 'eip155:8453',
  arbitrum: 'eip155:42161',
  optimism: 'eip155:10',
  polygon: 'eip155:137',
  linea: 'eip155:59144',
  bsc: 'eip155:56',
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export const chainNameToId = (chainName: string): CaipChainId | undefined =>
  CHAIN_NAME_TO_ID[chainName.toLowerCase()];

export const isSupportedChain = (chainName: string): boolean =>
  chainName.toLowerCase() in CHAIN_NAME_TO_ID;
