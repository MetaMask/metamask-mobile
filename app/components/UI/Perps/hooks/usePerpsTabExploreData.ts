import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from './usePerpsMarkets';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';
import type { PerpsMarketData } from '../controllers/types';

const EXPLORE_MARKETS_LIMIT = 8;

interface UsePerpsTabExploreDataOptions {
  /** Skip fetching when user has positions/orders */
  enabled: boolean;
}

interface UsePerpsTabExploreDataResult {
  /** Top 8 crypto + equity markets by volume */
  exploreMarkets: PerpsMarketData[];
  /** Markets in user's watchlist */
  watchlistMarkets: PerpsMarketData[];
  /** Loading state for markets data */
  isLoading: boolean;
}

/**
 * Business logic hook for Perps tab explore data.
 * Used when user has no open positions or orders.
 *
 * Provides:
 * - Top 8 markets by volume (crypto + equity)
 * - Watchlist markets
 */
export const usePerpsTabExploreData = ({
  enabled,
}: UsePerpsTabExploreDataOptions): UsePerpsTabExploreDataResult => {
  // Fetch markets (skip when disabled to avoid unnecessary data fetching)
  const { markets, isLoading } = usePerpsMarkets({
    skipInitialFetch: !enabled,
    showZeroVolume: false,
  });

  // Get watchlist symbols from Redux
  const watchlistSymbols = useSelector(selectPerpsWatchlistMarkets);

  // Filter explore markets: crypto + equity, top 8 by volume
  // Markets are already sorted by volume from usePerpsMarkets
  const exploreMarkets = useMemo(() => {
    if (!enabled) return [];
    return markets
      .filter((m) => !m.marketType || m.marketType === 'equity')
      .slice(0, EXPLORE_MARKETS_LIMIT);
  }, [markets, enabled]);

  // Filter watchlist markets
  const watchlistMarkets = useMemo(() => {
    if (!enabled) return [];
    return markets.filter((m) => watchlistSymbols.includes(m.symbol));
  }, [markets, watchlistSymbols, enabled]);

  return {
    exploreMarkets,
    watchlistMarkets,
    isLoading,
  };
};
