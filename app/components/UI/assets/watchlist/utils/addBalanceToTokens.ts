import type { Asset } from '@metamask/assets-controllers';

import type { WatchlistTokenMetadata } from './getTokens';

/**
 * Watchlist token enriched with the user's balance for the corresponding
 * asset, looked up from the assets controller state. Tokens that the user
 * does not currently hold default to a zero balance so the UI can render
 * them in the same row layout as held tokens.
 */
export interface WatchlistTokenWithBalance extends WatchlistTokenMetadata {
  /** Native balance as a human readable string (e.g. "1.234"). Defaults to "0". */
  balance: string;
  /** Fiat conversion of the balance, when available from controller state. */
  balanceFiat?: number;
  /** Currency code matching {@link balanceFiat}, when available. */
  fiatCurrency?: string;
  /** Whether the user currently holds a non-zero detected balance of this token. */
  isInWallet: boolean;
}

/**
 * Shape returned by {@link ../../../../../selectors/assets/assets-list:selectAssetsBySelectedAccountGroup}.
 *
 * Kept as a structural type to avoid a hard dependency on the selector's
 * exact return type (which depends on assets-controllers internals).
 */
export type AssetsByChain = Record<string, Asset[]>;

/**
 * Build an `assetId -> Asset` map from the by-chain shape exposed by the
 * assets controller selectors.
 *
 * The watchlist hydration step needs a constant-time lookup keyed by
 * CAIP-19 asset id; the controller selectors expose assets grouped by
 * chain id which is the wrong shape for that.
 */
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

/**
 * Hydrate watchlist token metadata with the user's wallet balance.
 *
 * Tokens that the user does not hold default to a zero balance and
 * `isInWallet: false` so the watchlist UI can show every starred token,
 * regardless of whether the user has any of it.
 */
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
