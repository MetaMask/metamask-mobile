import type { Asset } from '@metamask/assets-controllers';

import type { WatchlistTokenMetadata } from './getTokens';

export interface WatchlistTokenWithBalance extends WatchlistTokenMetadata {
  balance: string;
  balanceFiat?: number;
  fiatCurrency?: string;
  isInWallet: boolean;
}

export type AssetsByChain = Record<string, Asset[]>;

export const buildAssetsByAssetId = (
  assetsByChain: AssetsByChain | undefined,
): Record<string, Asset> => {
  const out: Record<string, Asset> = {};
  if (!assetsByChain) {
    return out;
  }
  for (const chainAssets of Object.values(assetsByChain)) {
    if (!chainAssets) continue;
    for (const asset of chainAssets) {
      if (asset?.assetId) {
        out[String(asset.assetId).toLowerCase()] = asset;
      }
    }
  }
  return out;
};

/** Tokens not held by the user default to zero balance / `isInWallet: false`. */
export const addBalanceToTokens = (
  tokens: readonly WatchlistTokenMetadata[],
  assetsByAssetId: Record<string, Asset>,
): WatchlistTokenWithBalance[] =>
  tokens.map((token) => {
    const match = assetsByAssetId[String(token.assetId).toLowerCase()];
    if (!match) {
      return {
        ...token,
        balance: '0',
        balanceFiat: undefined,
        fiatCurrency: undefined,
        isInWallet: false,
      };
    }
    return {
      ...token,
      balance: match.balance ?? '0',
      balanceFiat: match.fiat?.balance,
      fiatCurrency: match.fiat?.currency,
      isInWallet: true,
    };
  });
