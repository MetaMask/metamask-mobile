import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { PerpsMarketDataWithVolumeNumber } from '../../../../../UI/Perps/hooks/usePerpsMarkets';
import { usePerpsMarkets } from '../../../../../UI/Perps/hooks';
import { filterAndSortMarkets } from '../../../../../UI/Perps/utils/filterAndSortMarkets';
import { selectPerpsWatchlistMarkets } from '../../../../../UI/Perps/selectors/perpsController';
import { MAX_TRENDING_MARKETS } from '../constants';

export interface UsePerpsTrendingCarouselDataArgs {
  skipInitialFetch?: boolean;
}

export function usePerpsTrendingCarouselData({
  skipInitialFetch = false,
}: UsePerpsTrendingCarouselDataArgs = {}) {
  const { markets, isLoading: marketsLoading } = usePerpsMarkets({
    skipInitialFetch,
  });
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  const safeWatchlistSymbols = useMemo(
    () => watchlistSymbols ?? [],
    [watchlistSymbols],
  );

  const watchlistMarkets = useMemo(() => {
    if (markets.length === 0 || safeWatchlistSymbols.length === 0) return [];
    const marketBySymbol = new Map(markets.map((m) => [m.symbol, m]));
    return safeWatchlistSymbols
      .map((sym) => marketBySymbol.get(sym))
      .filter((m): m is PerpsMarketDataWithVolumeNumber => m != null);
  }, [markets, safeWatchlistSymbols]);

  const trendingMarkets = useMemo(() => {
    if (markets.length === 0) return [];
    const wlSet = new Set(watchlistMarkets.map((m) => m.symbol));
    return filterAndSortMarkets({
      marketData: markets,
      showZeroVolume: false,
    })
      .filter((m) => !wlSet.has(m.symbol))
      .slice(0, Math.max(0, MAX_TRENDING_MARKETS - watchlistMarkets.length));
  }, [markets, watchlistMarkets]);

  const allCarouselMarkets = useMemo(
    () =>
      [...(watchlistMarkets ?? []), ...(trendingMarkets ?? [])].slice(
        0,
        MAX_TRENDING_MARKETS,
      ),
    [watchlistMarkets, trendingMarkets],
  );

  const watchlistSymbolSet = useMemo(
    () => new Set((watchlistMarkets ?? []).map((m) => m.symbol)),
    [watchlistMarkets],
  );

  return {
    markets,
    marketsLoading,
    allCarouselMarkets,
    watchlistSymbolSet,
  };
}
