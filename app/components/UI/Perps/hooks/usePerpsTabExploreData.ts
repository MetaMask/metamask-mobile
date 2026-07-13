import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { usePerpsMarkets } from './usePerpsMarkets';
import { selectPerpsWatchlistMarkets } from '../selectors/perpsController';
import { type PerpsMarketData } from '@metamask/perps-controller';
import { getSuggestedWatchlistMarkets } from '../utils/marketUtils';

const EXPLORE_MARKETS_LIMIT = 8;

interface UsePerpsTabExploreDataOptions {
  /** Skip fetching when user has positions/orders */
  enabled: boolean;
}

interface UsePerpsTabExploreDataResult {
  /** Top 8 markets by volume (all types) */
  exploreMarkets: PerpsMarketData[];
  /** Markets in user's watchlist */
  watchlistMarkets: PerpsMarketData[];
  /** Top 5 markets by 24h volume, used as suggestions when watchlist is empty */
  suggestedWatchlistMarkets: PerpsMarketData[];
  /** Loading state for markets data */
  isLoading: boolean;
  /** Whether user has any watchlist symbols (available before markets load) */
  hasWatchlistSymbols: boolean;
}

/**
 * Business logic hook for Perps tab explore data.
 * Used when user has no open positions or orders.
 *
 * Provides:
 * - Top 8 markets by volume (all types)
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

  // Filter explore markets: all market types, top 8 by volume
  // Markets are already sorted by volume from usePerpsMarkets
  const exploreMarkets = useMemo(() => {
    if (!enabled) return [];
    return markets.slice(0, EXPLORE_MARKETS_LIMIT);
  }, [markets, enabled]);

  // Filter watchlist markets
  const watchlistMarkets = useMemo(() => {
    if (!enabled) return [];
    return markets.filter((m) => watchlistSymbols.includes(m.symbol));
  }, [markets, watchlistSymbols, enabled]);

  // Top markets by 24h volume — shown as suggestions below the watchlist.
  // Excludes already-watchlisted markets so the list shrinks as items are added,
  // with a floor of one via volume-ranked refill.
  const suggestedWatchlistMarkets = useMemo(() => {
    if (!enabled) return [];
    return getSuggestedWatchlistMarkets(markets, watchlistSymbols);
  }, [markets, watchlistSymbols, enabled]);

  return {
    exploreMarkets,
    watchlistMarkets,
    suggestedWatchlistMarkets,
    isLoading,
    hasWatchlistSymbols: watchlistSymbols.length > 0,
  };
};
