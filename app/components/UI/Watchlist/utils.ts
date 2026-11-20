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
  WatchlistFilter,
} from './types';

const SUGGESTED_WATCHLIST_LIMIT = 5;
export const INITIAL_TOKEN_SUGGESTION_COUNT = 2;
export const INITIAL_PERP_SUGGESTION_COUNT = 3;

const normalizeTokenWatchlistAssetId = (assetId: string): string =>
  assetId.toLowerCase().startsWith('eip155:') ? assetId.toLowerCase() : assetId;

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

/**
 * Builds a namespaced React identity for a token watchlist item.
 */
export const getTokenWatchlistKey = (assetId: string): string =>
  `token:${normalizeTokenWatchlistAssetId(assetId)}`;

/**
 * Builds a stable identity from the value owned by Perps watchlist membership.
 * Market metadata is intentionally excluded so identity survives hydration.
 */
export const getPerpsWatchlistKey = (
  marketOrSymbol: PerpsMarketData | string,
): string =>
  `perp:${
    typeof marketOrSymbol === 'string'
      ? marketOrSymbol.toLowerCase()
      : marketOrSymbol.symbol.toLowerCase()
  }`;

/**
 * Maps a hydrated watchlist token to the TrendingAsset shape used by row
 * components.
 */
export const mapWatchlistTokenToTrendingAsset = (
  token: WatchlistTokenWithBalance,
): TrendingAsset => ({
  assetId: String(token.assetId),
  name: token.name,
  symbol: token.symbol,
  decimals: token.decimals,
  price: token.marketData?.price != null ? String(token.marketData.price) : '0',
  marketCap: token.marketData?.marketCap ?? 0,
  aggregatedUsdVolume:
    token.marketData?.totalVolume ?? token.marketData?.volume24h ?? 0,
  priceChangePct: {
    h24:
      token.marketData?.pricePercentChange24h != null
        ? String(token.marketData.pricePercentChange24h)
        : undefined,
  },
});

/**
 * Returns suggested tokens that are not already in the watchlist.
 */
export const getSuggestedWatchlistTokens = (
  suggestedTokens: readonly WatchlistTokenWithBalance[],
  watchlistAssetIds: readonly string[],
  limit = SUGGESTED_WATCHLIST_LIMIT,
): WatchlistTokenWithBalance[] => {
  const targetCount = Math.max(0, limit - watchlistAssetIds.length);
  const watched = new Set(
    watchlistAssetIds.map(normalizeTokenWatchlistAssetId),
  );

  return suggestedTokens
    .filter(
      (token) =>
        !watched.has(normalizeTokenWatchlistAssetId(String(token.assetId))),
    )
    .slice(0, targetCount);
};

const normalizeSuggestedSymbol = (symbol: string): string =>
  (symbol.split(':').pop() ?? symbol).toLowerCase();

/**
 * Prioritizes non-crypto Perps and removes markets duplicated by token
 * suggestions. Crypto markets remain as a fallback when there are not enough
 * non-crypto markets to fill the suggestion slots.
 */
export const prioritizeSuggestedWatchlistPerps = (
  perps: readonly PerpsMarketData[],
  tokenSymbols: readonly string[],
): PerpsMarketData[] => {
  const tokenSymbolSet = new Set(tokenSymbols.map(normalizeSuggestedSymbol));
  const seenSymbols = new Set<string>();
  const nonDuplicates = perps.filter((market) => {
    const normalizedSymbol = normalizeSuggestedSymbol(market.symbol);
    if (
      tokenSymbolSet.has(normalizedSymbol) ||
      seenSymbols.has(normalizedSymbol)
    ) {
      return false;
    }
    seenSymbols.add(normalizedSymbol);
    return true;
  });

  return [
    ...nonDuplicates.filter((market) => market.isHip3 === true),
    ...nonDuplicates.filter((market) => market.isHip3 !== true),
  ];
};

/**
 * Selects one deterministic, bounded suggestion row list. Interleaving lives
 * here so renderers do not retain hidden ordering state.
 */
export const selectWatchlistSuggestions = (
  tokens: readonly WatchlistTokenWithBalance[],
  perps: readonly PerpsMarketData[],
  limit: number,
): SuggestedWatchlistRow[] => {
  const boundedLimit = Math.max(0, limit);
  const initialTokens = tokens.slice(0, INITIAL_TOKEN_SUGGESTION_COUNT);
  const initialPerps = perps.slice(0, INITIAL_PERP_SUGGESTION_COUNT);
  const orderedCandidates = [
    ...initialTokens.map((token) => ({
      kind: 'token' as const,
      key: getTokenWatchlistKey(String(token.assetId)),
      token,
    })),
    ...initialPerps.map((market) => ({
      kind: 'perp' as const,
      key: getPerpsWatchlistKey(market),
      market,
    })),
    ...tokens.slice(initialTokens.length).map((token) => ({
      kind: 'token' as const,
      key: getTokenWatchlistKey(String(token.assetId)),
      token,
    })),
    ...perps.slice(initialPerps.length).map((market) => ({
      kind: 'perp' as const,
      key: getPerpsWatchlistKey(market),
      market,
    })),
  ];

  const seenKeys = new Set<string>();
  const seenTokenSymbols = new Set<string>();
  const seenPerpSymbols = new Set<string>();
  return orderedCandidates
    .filter((row) => {
      if (seenKeys.has(row.key)) {
        return false;
      }
      const symbol = normalizeSuggestedSymbol(
        row.kind === 'token' ? row.token.symbol : row.market.symbol,
      );
      if (
        (row.kind === 'token' && seenPerpSymbols.has(symbol)) ||
        (row.kind === 'perp' && seenTokenSymbols.has(symbol))
      ) {
        return false;
      }

      seenKeys.add(row.key);
      if (row.kind === 'token') {
        seenTokenSymbols.add(symbol);
      } else {
        seenPerpSymbols.add(symbol);
      }
      return true;
    })
    .slice(0, boundedLimit);
};

/**
 * Maps hydrated token metadata to the heterogeneous watchlist view model.
 */
export const createUnifiedWatchlistToken = (
  token: TrendingAsset,
): UnifiedWatchlistToken => ({
  kind: 'token',
  key: getTokenWatchlistKey(String(token.assetId)),
  assetId: String(token.assetId),
  token,
});

/**
 * Maps a Perps market snapshot to the heterogeneous watchlist view model.
 */
export const createUnifiedWatchlistPerp = (
  market: PerpsMarketData,
): UnifiedWatchlistPerp => ({
  kind: 'perp',
  key: getPerpsWatchlistKey(market),
  symbol: market.symbol,
  status: 'resolved',
  market,
});

export const createUnavailableWatchlistPerp = (
  symbol: string,
  status: 'unavailable' | 'stale',
): UnifiedWatchlistPerp => ({
  kind: 'perp',
  key: getPerpsWatchlistKey(symbol),
  symbol,
  status,
});

/**
 * Builds the initial mixed order before the user has customized it.
 *
 * Each domain gets a row before either domain receives a second row. This
 * preserves visibility for both domains while still producing a deterministic
 * order that can be persisted as the user's presentation order.
 */
export const buildWatchlistItems = (
  tokens: readonly UnifiedWatchlistToken[],
  perps: readonly UnifiedWatchlistPerp[],
): UnifiedWatchlistItem[] => {
  const result: UnifiedWatchlistItem[] = [];
  let tokenIndex = 0;
  let perpIndex = 0;

  while (tokenIndex < tokens.length || perpIndex < perps.length) {
    if (tokenIndex < tokens.length) {
      result.push(tokens[tokenIndex]);
      tokenIndex += 1;
    }

    if (perpIndex < perps.length) {
      result.push(perps[perpIndex]);
      perpIndex += 1;
    }
  }

  return result;
};

/**
 * Limits the persisted mixed order for the bounded Homepage preview.
 */
export const buildHomepageWatchlistItems = (
  items: readonly UnifiedWatchlistItem[],
  limit: number,
): UnifiedWatchlistItem[] => items.slice(0, Math.max(0, limit));

/**
 * Returns a filtered heterogeneous list without changing item identities.
 */
export const filterWatchlistItems = (
  items: readonly UnifiedWatchlistItem[],
  filter: WatchlistFilter,
): UnifiedWatchlistItem[] =>
  filter === 'all'
    ? [...items]
    : items.filter((item) => item.kind === filter.slice(0, -1));

/**
 * Reconciles a persisted presentation order with the currently watched rows.
 * Unknown keys are dropped and newly watched rows are appended in source order.
 */
export const reconcileWatchlistOrder = (
  persistedOrder: readonly string[],
  availableItems: readonly UnifiedWatchlistItem[],
): string[] => {
  const availableKeys = new Set(availableItems.map((item) => item.key));
  const perpsBySymbol = new Map(
    availableItems
      .filter((item): item is UnifiedWatchlistPerp => item.kind === 'perp')
      .map((item) => [item.symbol.toLowerCase(), item.key]),
  );
  const seen = new Set<string>();
  const result: string[] = [];

  persistedOrder.forEach((persistedKey) => {
    let key = persistedKey;
    if (!availableKeys.has(key) && key.startsWith('perp:')) {
      const legacyIdentity = key.slice('perp:'.length).toLowerCase();
      const legacyIdentityParts = legacyIdentity.split(/[:/_-]/u);
      const exactKey = perpsBySymbol.get(legacyIdentity);
      const segmentMatches = Array.from(perpsBySymbol.entries()).filter(
        ([symbol]) =>
          !symbol.includes(':') && legacyIdentityParts.includes(symbol),
      );
      key =
        exactKey ?? (segmentMatches.length === 1 ? segmentMatches[0][1] : key);
    }

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
 * Returns whether the watchlist should avoid starting fresh remote hydration.
 */
export const shouldSkipWatchlistRemoteFetch = (
  _hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean => networkTier === 'NONE';

/**
 * Returns whether optional suggestion hydration should avoid remote work.
 */
export const shouldSkipWatchlistOptionalFetch = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean => networkTier === 'NONE' || hardwareTier === 'LOW';

/**
 * Returns whether a full-screen Perps row may subscribe to live prices.
 */
export const canUseWatchlistLivePrices = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean =>
  networkTier !== 'NONE' &&
  !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

export const canUseWatchlistMotion = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean =>
  networkTier !== 'NONE' &&
  !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');

export const canUseWatchlistGlass = (
  networkTier: NetworkTier | null,
): boolean => networkTier !== 'NONE';

export const getWatchlistPerpsPollingInterval = (
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): number | null => {
  if (networkTier === 'NONE') {
    return null;
  }
  if (hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR') {
    return 5000;
  }
  return 100;
};
