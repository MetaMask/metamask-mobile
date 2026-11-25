import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';
import type {
  HardwareTier,
  NetworkTier,
} from '../../../util/deviceCapability/types';
import type { WatchlistTokenWithBalance } from '../Assets/watchlist/utils/addBalanceToTokens';
import type {
  UnifiedWatchlistItem,
  UnifiedWatchlistPerp,
  UnifiedWatchlistToken,
} from './types';
import { isEvmCaip19AssetId } from '../../../util/multichain/isEvmCaip19AssetId';

const normalizeTokenAssetId = (assetId: string): string =>
  isEvmCaip19AssetId(assetId) ? assetId.toLowerCase() : assetId;

export const INITIAL_TOKEN_SUGGESTION_COUNT = 2;
export const INITIAL_PERP_SUGGESTION_COUNT = 3;

export type SuggestedWatchlistRow =
  | {
      kind: 'token';
      key: string;
      token: WatchlistTokenWithBalance;
    }
  | {
      kind: 'perp';
      key: string;
      market: PerpsMarketData;
    };

interface SelectWatchlistSuggestionsOptions {
  limit: number;
  watchlistedTokenAssetIds?: readonly string[];
  watchlistedTokenSymbols?: readonly string[];
  watchlistedPerpSymbols?: readonly string[];
}

const normalizeSuggestedSymbol = (symbol: string): string =>
  (symbol.split(':').pop() ?? symbol).toLowerCase();

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
 * Keeps the existing unified presentation order while appending newly watched
 * rows to the end and dropping rows whose membership was removed.
 */
export const reconcileWatchlistItemOrder = (
  previousOrder: readonly string[],
  items: readonly UnifiedWatchlistItem[],
): string[] => {
  const currentKeys = new Set(items.map((item) => item.key));
  const nextOrder = previousOrder.filter((key) => currentKeys.has(key));
  const knownKeys = new Set(nextOrder);

  items.forEach((item) => {
    if (!knownKeys.has(item.key)) {
      nextOrder.push(item.key);
      knownKeys.add(item.key);
    }
  });

  return nextOrder;
};

/**
 * Selects the bounded homepage suggestion order: two tokens followed by
 * three Perps markets. Equal token and Perps tickers are shown once.
 */
export const selectWatchlistSuggestions = (
  tokens: readonly WatchlistTokenWithBalance[],
  perps: readonly PerpsMarketData[],
  {
    limit,
    watchlistedTokenAssetIds = [],
    watchlistedTokenSymbols = [],
    watchlistedPerpSymbols = [],
  }: SelectWatchlistSuggestionsOptions,
): SuggestedWatchlistRow[] => {
  const watchedTokenAssetIds = new Set(
    watchlistedTokenAssetIds.map(normalizeTokenAssetId),
  );
  const watchedTokenSymbols = new Set(
    watchlistedTokenSymbols.map(normalizeSuggestedSymbol),
  );
  const watchedPerpSymbols = new Set(
    watchlistedPerpSymbols.map(normalizeSuggestedSymbol),
  );
  const eligibleTokens = tokens.filter((token) => {
    const symbol = normalizeSuggestedSymbol(String(token.symbol));
    return (
      !watchedTokenAssetIds.has(normalizeTokenAssetId(String(token.assetId))) &&
      !watchedPerpSymbols.has(symbol)
    );
  });
  const initialTokens = eligibleTokens.slice(0, INITIAL_TOKEN_SUGGESTION_COUNT);
  const initialTokenSymbols = new Set(
    initialTokens.map((token) =>
      normalizeSuggestedSymbol(String(token.symbol)),
    ),
  );
  const eligiblePerps = perps.filter((market) => {
    const symbol = normalizeSuggestedSymbol(market.symbol);
    return (
      !watchedTokenSymbols.has(symbol) &&
      !watchedPerpSymbols.has(symbol) &&
      !initialTokenSymbols.has(symbol)
    );
  });
  const candidates: SuggestedWatchlistRow[] = [
    ...initialTokens.map((token) => ({
      kind: 'token' as const,
      key: getTokenWatchlistKey(String(token.assetId)),
      token,
    })),
    ...eligiblePerps.slice(0, INITIAL_PERP_SUGGESTION_COUNT).map((market) => ({
      kind: 'perp' as const,
      key: getPerpsWatchlistKey(market.symbol),
      market,
    })),
    ...eligibleTokens.slice(INITIAL_TOKEN_SUGGESTION_COUNT).map((token) => ({
      kind: 'token' as const,
      key: getTokenWatchlistKey(String(token.assetId)),
      token,
    })),
    ...eligiblePerps.slice(INITIAL_PERP_SUGGESTION_COUNT).map((market) => ({
      kind: 'perp' as const,
      key: getPerpsWatchlistKey(market.symbol),
      market,
    })),
  ];

  const seenKeys = new Set<string>();
  const seenSymbols = new Set<string>();

  return candidates
    .filter((candidate) => {
      const symbol = normalizeSuggestedSymbol(
        candidate.kind === 'token'
          ? String(candidate.token.symbol)
          : candidate.market.symbol,
      );

      if (seenKeys.has(candidate.key) || seenSymbols.has(symbol)) {
        return false;
      }

      seenKeys.add(candidate.key);
      seenSymbols.add(symbol);
      return true;
    })
    .slice(0, Math.max(0, limit));
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
