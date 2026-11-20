import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../util/deviceCapability/types';
import type {
  UnifiedWatchlistItem,
  UnifiedWatchlistPerp,
  UnifiedWatchlistToken,
} from './types';
import { isEvmCaip19AssetId } from '../../../util/multichain/isEvmCaip19AssetId';

const normalizeTokenAssetId = (assetId: string): string =>
  isEvmCaip19AssetId(assetId) ? assetId.toLowerCase() : assetId;

/**
 * Creates a namespaced token identity so equal token and Perps tickers remain
 * separate rows.
 */
export const getTokenWatchlistKey = (assetId: string): string =>
  `token:${normalizeTokenAssetId(assetId)}`;

/**
 * Creates a namespaced Perps identity from watchlist-owned membership data.
 */
export const getPerpsWatchlistKey = (symbol: string): string =>
  `perp:${symbol.toLowerCase()}`;

export const createUnifiedWatchlistToken = (
  token: TrendingAsset,
): UnifiedWatchlistToken => ({
  kind: 'token',
  key: getTokenWatchlistKey(String(token.assetId)),
  assetId: String(token.assetId),
  token,
});

export const createUnifiedWatchlistPerp = (
  market: PerpsMarketData,
): UnifiedWatchlistPerp => ({
  kind: 'perp',
  key: getPerpsWatchlistKey(market.symbol),
  symbol: market.symbol,
  status: 'resolved',
  market,
});

export const createUnavailableWatchlistPerp = (
  symbol: string,
): UnifiedWatchlistPerp => ({
  kind: 'perp',
  key: getPerpsWatchlistKey(symbol),
  symbol,
  status: 'unavailable',
});

/**
 * Deterministically alternates token and Perps rows without conflating their
 * identities.
 */
export const buildWatchlistItems = (
  tokens: readonly UnifiedWatchlistToken[],
  perps: readonly UnifiedWatchlistPerp[],
): UnifiedWatchlistItem[] => {
  const items: UnifiedWatchlistItem[] = [];
  const rowCount = Math.max(tokens.length, perps.length);

  for (let index = 0; index < rowCount; index += 1) {
    const token = tokens[index];
    const perp = perps[index];

    if (token) {
      items.push(token);
    }
    if (perp) {
      items.push(perp);
    }
  }

  return items;
};

/**
 * Limits the persisted mixed order for the bounded Homepage preview.
 */
export const buildHomepageWatchlistItems = (
  items: readonly UnifiedWatchlistItem[],
  limit: number,
): UnifiedWatchlistItem[] => items.slice(0, Math.max(0, limit));

/**
 * Reconciles persisted presentation order with current watchlist membership.
 * Removed keys are dropped and new rows are appended in source order.
 */
export const reconcileWatchlistOrder = (
  persistedOrder: readonly string[],
  availableItems: readonly UnifiedWatchlistItem[],
): string[] => {
  const availableKeys = new Set(availableItems.map((item) => item.key));
  const seen = new Set<string>();
  const result: string[] = [];

  persistedOrder.forEach((key) => {
    if (availableKeys.has(key) && !seen.has(key)) {
      result.push(key);
      seen.add(key);
    }
  });

  availableItems.forEach((item) => {
    if (!seen.has(item.key)) {
      result.push(item.key);
      seen.add(item.key);
    }
  });

  return result;
};

export const reorderWatchlistItems = (
  items: readonly UnifiedWatchlistItem[],
  from: number,
  to: number,
): UnifiedWatchlistItem[] => {
  const result = [...items];
  const [moved] = result.splice(from, 1);
  if (moved === undefined) {
    return result;
  }
  result.splice(to, 0, moved);
  return result;
};

/**
 * LOW + slow cellular and offline cells avoid row-level live subscriptions.
 * Unknown tiers retain the product default.
 */
export const canUseWatchlistLivePrices = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean =>
  networkTier !== 'NONE' &&
  !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

export const canUseWatchlistMotion = canUseWatchlistLivePrices;
