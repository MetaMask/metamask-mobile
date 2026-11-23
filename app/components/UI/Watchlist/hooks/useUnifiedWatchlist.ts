import { useCallback, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectPerpsEnabledFlag } from '../../Perps/selectors/featureFlags';
import { selectPerpsWatchlistMarkets } from '../../Perps/selectors/perpsController';
import { usePerpsMarkets } from '../../Perps/hooks';
import {
  selectTokenWatchlistEnabled,
  selectUnifiedWatchlistEnabled,
} from '../../Assets/selectors/featureFlags';
import { useTokenWatchlistQuery } from '../../Assets/watchlist/hooks/useTokenWatchlistQuery';
import { useTokenWatchlistMembershipQuery } from '../../Assets/watchlist/hooks/useTokenWatchlist';
import { mapWatchlistTokenToTrendingAsset } from '../../../Views/Homepage/Sections/Watchlist/utils/mapWatchlistTokenToTrendingAsset';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';
import type {
  UnifiedWatchlistPerp,
  UnifiedWatchlistResult,
  UnifiedWatchlistToken,
} from '../types';
import {
  buildWatchlistItems,
  canUseWatchlistLivePrices,
  canUseWatchlistMotion,
  createUnavailableWatchlistPerp,
  createUnifiedWatchlistPerp,
  createUnifiedWatchlistToken,
  getTokenWatchlistKey,
} from '../utils';
import { TEMPORARY_ENABLE_WATCHLIST_PERPS } from '../watchlistFeatureOverrides';
import { useWatchlistOrder } from './useWatchlistOrder';

const EMPTY_SYMBOLS: string[] = [];
const EMPTY_ASSET_IDS: string[] = [];

/**
 * Resolves independently-owned token and Perps memberships into rows for the
 * shared watchlist presentation.
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
  const [isRefreshing, setIsRefreshing] = useState(false);

  const isPerpsEnabled =
    isTokenWatchlistEnabled && isUnifiedEnabled && isPerpsFeatureEnabled;
  const isOffline = networkTier === 'NONE';

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
  } = useTokenWatchlistQuery({ skipRemoteFetch: isOffline });
  const {
    markets,
    isLoading: isPerpsLoading,
    error: perpsError,
    refresh: refreshPerps,
    hasResolvedInitialData: hasResolvedPerpsData,
  } = usePerpsMarkets({
    skipInitialFetch: !isPerpsEnabled || isOffline,
    showZeroVolume: true,
    showZeroOpenInterest: true,
  });

  const tokens = useMemo<UnifiedWatchlistToken[]>(
    () =>
      (isTokenWatchlistEnabled ? (tokenData ?? []) : [])
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
      (tokenMembershipAssetIds.length === 0 ||
        (tokenData !== undefined &&
          tokenMembershipAssetIds.every((assetId) =>
            hydratedTokenKeys.has(getTokenWatchlistKey(assetId)),
          ))));
  const tokenMetadataCoverageError =
    isTokenWatchlistEnabled &&
    tokenMembershipBlob !== undefined &&
    tokenData !== undefined &&
    !isTokenMetadataComplete
      ? 'Some watchlist metadata is unavailable'
      : null;
  const isTokenHydrationUnavailable =
    isTokenWatchlistEnabled &&
    isOffline &&
    tokenMembershipAssetIds.length > 0 &&
    tokenData === undefined &&
    !tokenError;
  const isPerpsMetadataTerminal =
    !isPerpsEnabled || isOffline || hasResolvedPerpsData || Boolean(perpsError);

  const perps = useMemo<UnifiedWatchlistPerp[]>(() => {
    if (!isPerpsEnabled || !isPerpsMetadataTerminal) {
      return [];
    }

    const marketsBySymbol = new Map(
      markets.map((market) => [market.symbol.toLowerCase(), market]),
    );

    return watchlistSymbols.map((symbol) => {
      const market = marketsBySymbol.get(symbol.toLowerCase());
      return market
        ? createUnifiedWatchlistPerp(market)
        : createUnavailableWatchlistPerp(symbol);
    });
  }, [isPerpsEnabled, isPerpsMetadataTerminal, markets, watchlistSymbols]);

  const availableItems = useMemo(
    () => buildWatchlistItems(tokens, perps),
    [perps, tokens],
  );
  const {
    orderedItems: items,
    isLoading: isOrderLoading,
    isReady: isOrderReady,
    error: orderError,
    retry: retryOrder,
    persistOrder,
    appendOrderKey,
  } = useWatchlistOrder(availableItems, {
    enabled: isPerpsEnabled,
  });

  const suggestedPerps = useMemo(() => {
    if (!isPerpsEnabled || isOffline) {
      return [];
    }
    const watchedSymbols = new Set(
      watchlistSymbols.map((symbol) => symbol.toLowerCase()),
    );
    return markets.filter(
      (market) => !watchedSymbols.has(market.symbol.toLowerCase()),
    );
  }, [isOffline, isPerpsEnabled, markets, watchlistSymbols]);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    const refreshes: Promise<unknown>[] = [];
    try {
      if (isTokenWatchlistEnabled) {
        refreshes.push(refetchTokenMembership());
      }
      if (!isOffline) {
        refreshes.push(refetchTokens());
      }
      if (isPerpsEnabled && !isOffline) {
        refreshes.push(refreshPerps());
      }
      if (isPerpsEnabled && orderError) {
        refreshes.push(retryOrder());
      }
      await Promise.allSettled(refreshes);
    } finally {
      setIsRefreshing(false);
    }
  }, [
    isOffline,
    isPerpsEnabled,
    isTokenWatchlistEnabled,
    orderError,
    refetchTokenMembership,
    refetchTokens,
    refreshPerps,
    retryOrder,
  ]);

  return {
    items,
    isOrderReady,
    orderError,
    tokens: {
      items: tokens,
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
      error: isPerpsEnabled ? perpsError : null,
    },
    suggestedPerps,
    canUseLivePerpsPrices:
      isPerpsEnabled && canUseWatchlistLivePrices(hardwareTier, networkTier),
    canUseMotion: canUseWatchlistMotion(hardwareTier, networkTier),
    canRefresh: !isOffline || Boolean(orderError),
    canFetchSuggestions: !isOffline && hardwareTier !== 'LOW',
    tokenMembershipAssetIds,
    tokenCount: isTokenWatchlistEnabled ? tokenMembershipAssetIds.length : 0,
    perpsCount: isPerpsEnabled ? watchlistSymbols.length : 0,
    isInitialLoading:
      isRefreshing ||
      (isTokenWatchlistEnabled &&
        (isTokenMembershipLoading || (!isOffline && isTokenLoading))) ||
      (isPerpsEnabled && isPerpsLoading && !isOffline) ||
      isOrderLoading,
    persistOrder,
    appendOrderKey,
    refresh,
  };
};
