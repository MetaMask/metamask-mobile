import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../Perps/selectors/featureFlags';
import { usePerpsMarkets } from '../../Perps/hooks';
import { selectPerpsWatchlistMarkets } from '../../Perps/selectors/perpsController';
import {
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
} from '../../Assets/selectors/featureFlags';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import {
  useTokenWatchlistQuery,
  type UseTokenWatchlistQueryOptions,
} from '../../Assets/watchlist/hooks/useTokenWatchlistQuery';
import { useTokenWatchlistMembershipQuery } from '../../Assets/watchlist/hooks/useTokenWatchlist';
import type {
  UnifiedWatchlistPerp,
  UnifiedWatchlistResult,
  UnifiedWatchlistToken,
} from '../types';
import {
  buildWatchlistItems,
  canUseWatchlistGlass,
  canUseWatchlistLivePrices,
  canUseWatchlistMotion,
  createUnavailableWatchlistPerp,
  createUnifiedWatchlistPerp,
  createUnifiedWatchlistToken,
  getTokenWatchlistKey,
  shouldSkipWatchlistOptionalFetch,
  shouldSkipWatchlistRemoteFetch,
  mapWatchlistTokenToTrendingAsset,
} from '../utils';
import {
  getSuggestedWatchlistMarkets,
  WATCHLIST_LIMIT,
} from '../../Perps/utils/marketUtils';
import { TEMPORARY_ENABLE_WATCHLIST_PERPS } from '../watchlistFeatureOverrides';
import { useWatchlistOrder } from './useWatchlistOrder';

const EMPTY_SYMBOLS: string[] = [];
const EMPTY_ASSET_IDS: string[] = [];
const SUGGESTED_WATCHLIST_LIMIT = 10;

/**
 * Composes the token and Perps watchlists into a presentation model.
 *
 * Token membership remains owned by AuthenticatedUserStorageService and Perps
 * membership remains owned by PerpsController. This hook only resolves both
 * stores into rows that can be rendered together.
 */
export const useUnifiedWatchlist = (): UnifiedWatchlistResult => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const isUnifiedEnabled =
    useSelector(selectUnifiedWatchlistEnabled) ||
    TEMPORARY_ENABLE_WATCHLIST_PERPS;
  const isPerpsFeatureEnabled =
    useSelector(selectPerpsEnabledFlag) || TEMPORARY_ENABLE_WATCHLIST_PERPS;
  const watchlistSymbols =
    useSelector(selectPerpsWatchlistMarkets) ?? EMPTY_SYMBOLS;
  const networkTier = useNetworkTier();
  const [hardwareTier] = useState(() => getHardwareTier());

  const isPerpsEnabled =
    isTokenWatchlistEnabled && isUnifiedEnabled && isPerpsFeatureEnabled;
  const shouldSkipRemoteFetch = shouldSkipWatchlistRemoteFetch(
    hardwareTier,
    networkTier,
  );
  const shouldSkipOptionalFetch = shouldSkipWatchlistOptionalFetch(
    hardwareTier,
    networkTier,
  );

  // Reuse cached token metadata when remote hydration is skipped. A cold cache
  // is surfaced as unavailable data below rather than as an empty watchlist.
  const tokenQueryOptions: UseTokenWatchlistQueryOptions = {
    skipRemoteFetch: shouldSkipRemoteFetch,
  };
  const {
    data: tokenMembershipBlob,
    isLoading: isTokenMembershipLoading,
    error: tokenMembershipError,
    refetch: refetchTokenMembership,
  } = useTokenWatchlistMembershipQuery(isTokenWatchlistEnabled);
  const {
    data: tokenData,
    isLoading: isTokenLoading,
    error: tokenError,
    refetch: refetchTokens,
  } = useTokenWatchlistQuery(tokenQueryOptions);

  const {
    markets,
    isLoading: isPerpsLoading,
    error: perpsError,
    refresh: refreshPerps,
    hasResolvedInitialData,
  } = usePerpsMarkets({
    skipInitialFetch: !isPerpsEnabled || shouldSkipRemoteFetch,
    // Favorites should remain resolvable even when a market has no current
    // volume/open-interest value. Those filters are appropriate for discovery
    // feeds, not for a user's explicitly saved markets.
    showZeroVolume: true,
    showZeroOpenInterest: true,
  });

  const tokens = useMemo<UnifiedWatchlistToken[]>(
    () =>
      (isTokenWatchlistEnabled ? (tokenData ?? []) : [])
        .slice()
        .reverse()
        .map(mapWatchlistTokenToTrendingAsset)
        .map(createUnifiedWatchlistToken),
    [isTokenWatchlistEnabled, tokenData],
  );
  const tokenMembershipAssetIds = isTokenWatchlistEnabled
    ? (tokenMembershipBlob?.assets ?? EMPTY_ASSET_IDS)
    : EMPTY_ASSET_IDS;
  const hydratedTokenKeys = useMemo(
    () => new Set(tokens.map((item) => item.key)),
    [tokens],
  );
  const isTokenMetadataComplete =
    !isTokenWatchlistEnabled ||
    (tokenMembershipBlob !== undefined &&
      tokenData !== undefined &&
      tokenMembershipAssetIds.every((assetId) =>
        hydratedTokenKeys.has(getTokenWatchlistKey(assetId)),
      ));
  const tokenMetadataCoverageError =
    isTokenWatchlistEnabled &&
    tokenMembershipBlob !== undefined &&
    tokenData !== undefined &&
    !isTokenMetadataComplete
      ? 'Some watchlist metadata is unavailable'
      : null;

  const hasResolvedPerpsSnapshot =
    isPerpsEnabled &&
    (markets.length > 0 ||
      (hasResolvedInitialData === true && !shouldSkipRemoteFetch));
  const perps = useMemo<UnifiedWatchlistPerp[]>(() => {
    if (!isPerpsEnabled) {
      return [];
    }

    const marketBySymbol = new Map<string, (typeof markets)[number]>();
    markets.forEach((market) => {
      marketBySymbol.set(market.symbol, market);
      marketBySymbol.set(market.symbol.toLowerCase(), market);
    });

    return watchlistSymbols.map((symbol) => {
      const market =
        marketBySymbol.get(symbol) ?? marketBySymbol.get(symbol.toLowerCase());
      if (!market) {
        return createUnavailableWatchlistPerp(
          symbol,
          hasResolvedPerpsSnapshot ? 'stale' : 'unavailable',
        );
      }
      return createUnifiedWatchlistPerp(market);
    });
  }, [hasResolvedPerpsSnapshot, isPerpsEnabled, markets, watchlistSymbols]);

  const availableItems = useMemo(
    () => buildWatchlistItems(tokens, perps),
    [perps, tokens],
  );
  const suggestedPerps = useMemo(
    () =>
      isPerpsEnabled &&
      hasResolvedPerpsSnapshot &&
      watchlistSymbols.length < WATCHLIST_LIMIT
        ? getSuggestedWatchlistMarkets(
            markets,
            watchlistSymbols,
            watchlistSymbols.length + SUGGESTED_WATCHLIST_LIMIT,
          )
        : [],
    [hasResolvedPerpsSnapshot, isPerpsEnabled, markets, watchlistSymbols],
  );
  const isMixedOrderHydrationReady =
    isPerpsEnabled && isTokenMetadataComplete && !isPerpsLoading;
  const {
    orderedItems,
    isLoading: isOrderLoading,
    isReady: isOrderReady,
    error: orderError,
    retry: retryOrder,
    persistOrder,
  } = useWatchlistOrder(availableItems, {
    enabled: isPerpsEnabled,
    isReady: isMixedOrderHydrationReady,
  });
  const isTokenHydrationUnavailable =
    isTokenWatchlistEnabled &&
    shouldSkipRemoteFetch &&
    tokenData === undefined &&
    !tokenError;

  const refresh = useCallback(async () => {
    const refreshes: Promise<unknown>[] = [];
    if (isTokenWatchlistEnabled) {
      refreshes.push(refetchTokenMembership());
    }
    if (!shouldSkipRemoteFetch) {
      refreshes.push(refetchTokens());
    }
    if (isPerpsEnabled && !shouldSkipRemoteFetch) {
      refreshes.push(refreshPerps());
    }
    if (isPerpsEnabled && orderError) {
      refreshes.push(retryOrder());
    }
    await Promise.allSettled(refreshes);
  }, [
    isPerpsEnabled,
    isTokenWatchlistEnabled,
    orderError,
    refetchTokenMembership,
    refetchTokens,
    refreshPerps,
    retryOrder,
    shouldSkipRemoteFetch,
  ]);

  return useMemo(
    () => ({
      isUnifiedEnabled,
      isPerpsEnabled,
      orderedItems,
      isOrderLoading,
      isOrderReady,
      orderError,
      tokens: {
        items: tokens,
        isLoading:
          isTokenWatchlistEnabled &&
          (isTokenMembershipLoading || isTokenLoading),
        error: isTokenWatchlistEnabled
          ? (tokenMembershipError?.message ??
            tokenError?.message ??
            tokenMetadataCoverageError ??
            (isTokenHydrationUnavailable
              ? 'Watchlist metadata is unavailable offline'
              : null))
          : null,
      },
      perps: {
        items: perps,
        isLoading: isPerpsEnabled && isPerpsLoading,
        error: isPerpsEnabled ? perpsError : null,
      },
      suggestedPerps,
      canUseLivePerpsPrices:
        isPerpsEnabled && canUseWatchlistLivePrices(hardwareTier, networkTier),
      canUseMotion: canUseWatchlistMotion(hardwareTier, networkTier),
      canUseGlass: canUseWatchlistGlass(networkTier),
      canRefresh: !shouldSkipRemoteFetch || Boolean(orderError),
      canFetchSuggestions: !shouldSkipOptionalFetch,
      tokenMembershipAssetIds,
      isTokenMetadataComplete,
      tokenCount: isTokenWatchlistEnabled ? tokenMembershipAssetIds.length : 0,
      perpsCount: isPerpsEnabled ? watchlistSymbols.length : 0,
      isInitialLoading:
        (isTokenWatchlistEnabled &&
          (isTokenMembershipLoading || isTokenLoading)) ||
        (isPerpsEnabled && isPerpsLoading) ||
        (isPerpsEnabled && isOrderLoading),
      persistOrder,
      refresh,
    }),
    [
      hardwareTier,
      isPerpsEnabled,
      isOrderLoading,
      isOrderReady,
      orderError,
      isPerpsLoading,
      isTokenHydrationUnavailable,
      isTokenLoading,
      isTokenMembershipLoading,
      isTokenMetadataComplete,
      isTokenWatchlistEnabled,
      isUnifiedEnabled,
      networkTier,
      orderedItems,
      perps,
      perpsError,
      persistOrder,
      refresh,
      shouldSkipOptionalFetch,
      shouldSkipRemoteFetch,
      suggestedPerps,
      tokenMembershipAssetIds,
      tokenMembershipError,
      tokenMetadataCoverageError,
      tokenError,
      tokens,
      watchlistSymbols.length,
    ],
  );
};
