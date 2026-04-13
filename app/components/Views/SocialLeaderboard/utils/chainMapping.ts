import type { Hex, CaipChainId } from '@metamask/utils';

const CHAIN_NAME_TO_ID: Record<string, Hex | CaipChainId> = {
  ethereum: '0x1',
  base: '0x2105',
  solana: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',
};

export const chainNameToId = (
  chainName: string,
): Hex | CaipChainId | undefined => CHAIN_NAME_TO_ID[chainName.toLowerCase()];
