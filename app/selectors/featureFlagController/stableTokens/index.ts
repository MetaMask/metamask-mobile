import { createSelector } from 'reselect';
import { selectRemoteFeatureFlags } from '..';
import type { Hex } from '@metamask/utils';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export const STABLE_TOKENS_FLAG = 'stable-tokens' as const;

const DEFAULT_STABLECOINS: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [
    '0xaca92e438df0b2401ff60da7e4337b687a2435da', // MUSD
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  ],
  [CHAIN_IDS.ARBITRUM]: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
  ],
  [CHAIN_IDS.LINEA_MAINNET]: [
    '0xaca92e438df0b2401ff60da7e4337b687a2435da', // MUSD
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // USDC
    '0xa219439258ca9da29e9cc4ce5596924745e12b93', // USDT
  ],
  [CHAIN_IDS.POLYGON]: [
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e
    '0xc011a7e12a19f7b1f670d46f03b03f3342e82dfb', // pUSD
  ],
};

function normalizeStablecoins(
  raw: Record<string, unknown>,
): Record<Hex, Hex[]> {
  return Object.entries(raw).reduce<Record<Hex, Hex[]>>(
    (acc, [chainId, addresses]) => {
      if (Array.isArray(addresses)) {
        acc[chainId.toLowerCase() as Hex] = addresses.map(
          (a: string) => a.toLowerCase() as Hex,
        );
      }
      return acc;
    },
    {},
  );
}

export const selectStablecoins = createSelector(
  selectRemoteFeatureFlags,
  (remoteFeatureFlags): Record<Hex, Hex[]> => {
    const flag = remoteFeatureFlags?.[STABLE_TOKENS_FLAG];

    if (flag && typeof flag === 'object' && !Array.isArray(flag)) {
      return normalizeStablecoins(flag as Record<string, unknown>);
    }

    return DEFAULT_STABLECOINS;
  },
);
