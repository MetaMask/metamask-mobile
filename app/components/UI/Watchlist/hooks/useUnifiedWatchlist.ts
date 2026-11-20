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
import { useWatchlistOrder } from './useWatchlistOrder';

const EMPTY_SYMBOLS: string[] = [];
const EMPTY_ASSET_IDS: string[] = [];

/**
 * Resolves independently-owned token and Perps memberships into rows for the
 * shared watchlist presentation.
 */
export const useUnifiedWatchlist = (): UnifiedWatchlistResult => {
  const isTokenWatchlistEnabled = useSelector(selectTokenWatchlistEnabled);
  const isUnifiedEnabled = useSelector(selectUnifiedWatchlistEnabled);
  const isPerpsFeatureEnabled = useSelector(selectPerpsEnabledFlag);
  const watchlistSymbols =
    useSelector(selectPerpsWatchlistMarkets) ?? EMPTY_SYMBOLS;
  const networkTier = useNetworkTier();
  const [hardwareTier] = useState(() => getHardwareTier());

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
  } = usePerpsMarkets({
    skipInitialFetch: !isPerpsEnabled || isOffline,
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

  const perps = useMemo<UnifiedWatchlistPerp[]>(() => {
    if (!isPerpsEnabled) {
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
  }, [isPerpsEnabled, markets, watchlistSymbols]);

  const availableItems = useMemo(
    () => buildWatchlistItems(tokens, perps),
    [perps, tokens],
  );
  const {
    orderedItems,
    isLoading: isOrderLoading,
    isReady: isOrderReady,
    error: orderError,
    retry: retryOrder,
    persistOrder,
  } = useWatchlistOrder(availableItems, {
    enabled: isPerpsEnabled,
    isReady: isPerpsEnabled && isTokenMetadataComplete && !isPerpsLoading,
  });

  const refresh = useCallback(async () => {
    const refreshes: Promise<unknown>[] = [];
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
        (isTokenMembershipLoading || (!isOffline && isTokenLoading)),
      error: isTokenWatchlistEnabled
        ? (tokenMembershipError?.message ??
          tokenError?.message ??
          tokenMetadataCoverageError)
        : null,
    },
    perps: {
      items: perps,
      isLoading: isPerpsEnabled && isPerpsLoading,
      error: isPerpsEnabled ? perpsError : null,
    },
    canUseLivePerpsPrices:
      isPerpsEnabled && canUseWatchlistLivePrices(hardwareTier, networkTier),
    canUseMotion: canUseWatchlistMotion(hardwareTier, networkTier),
    canRefresh: !isOffline || Boolean(orderError),
    canFetchSuggestions: !isOffline && hardwareTier !== 'LOW',
    tokenMembershipAssetIds,
    isTokenMetadataComplete,
    tokenCount: isTokenWatchlistEnabled ? tokenMembershipAssetIds.length : 0,
    isInitialLoading:
      (isTokenWatchlistEnabled &&
        (isTokenMembershipLoading || (!isOffline && isTokenLoading))) ||
      (isPerpsEnabled && isPerpsLoading && !isOffline) ||
      (isPerpsEnabled && isOrderLoading),
    persistOrder,
    refresh,
  };
};
