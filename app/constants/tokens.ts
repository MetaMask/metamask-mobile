import { Hex } from '@metamask/utils';

/**
 * Fallback metadata for aTokens not yet in the tokens API.
 * Temporary until the API includes these tokens.
 */
export const ATOKEN_METADATA_FALLBACK: Record<
  Hex,
  Record<string, { name: string; symbol: string; decimals: number }>
> = {
  // Mainnet (chainId: 0x1)
  '0x1': {
    '0xaa0200d169ff3ba9385c12e073c5d1d30434ae7b': {
      name: 'Aave v3 MUSD',
      symbol: 'AMUSD',
      decimals: 6,
    },
  },
  // Linea Mainnet (chainId: 0xe708)
  '0xe708': {
    '0x61b19879f4033c2b5682a969cccc9141e022823c': {
      name: 'Aave v3 MUSD',
      symbol: 'AMUSD',
      decimals: 6,
    },
  },
};

/**
 * Check if a string looks like an address or is missing.
 * Used to determine if token metadata needs fallback values.
 */
export const isAddressLikeOrMissing = (str: string | undefined): boolean =>
  !str || str.startsWith('0x') || str.length === 0;
