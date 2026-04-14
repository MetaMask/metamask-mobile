import type { CaipChainId } from '@metamask/utils';

const CHAIN_NAME_TO_ID: Record<string, CaipChainId> = {
  ethereum: 'eip155:1',
  base: 'eip155:8453',
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export const chainNameToId = (chainName: string): CaipChainId | undefined =>
  CHAIN_NAME_TO_ID[chainName.toLowerCase()];
