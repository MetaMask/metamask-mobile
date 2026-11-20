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
} from '../utils';

const EMPTY_SYMBOLS: string[] = [];

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

  const items = useMemo(
    () => buildWatchlistItems(tokens, perps),
    [perps, tokens],
  );

  const refresh = useCallback(async () => {
    const refreshes: Promise<unknown>[] = [refetchTokens()];
    if (isPerpsEnabled && !isOffline) {
      refreshes.push(refreshPerps());
    }
    await Promise.allSettled(refreshes);
  }, [isOffline, isPerpsEnabled, refetchTokens, refreshPerps]);

  return {
    isUnifiedEnabled,
    isPerpsEnabled,
    items,
    tokens: {
      items: tokens,
      isLoading: !isOffline && isTokenLoading,
      error: tokenError?.message ?? null,
    },
    perps: {
      items: perps,
      isLoading: isPerpsEnabled && isPerpsLoading,
      error: isPerpsEnabled ? perpsError : null,
    },
    canUseLivePerpsPrices:
      isPerpsEnabled && canUseWatchlistLivePrices(hardwareTier, networkTier),
    canUseMotion: canUseWatchlistMotion(hardwareTier, networkTier),
    canRefresh: !isOffline,
    canFetchSuggestions: !isOffline && hardwareTier !== 'LOW',
    isInitialLoading:
      (!isOffline && isTokenLoading) ||
      (isPerpsEnabled && isPerpsLoading && !isOffline),
    refresh,
  };
};
