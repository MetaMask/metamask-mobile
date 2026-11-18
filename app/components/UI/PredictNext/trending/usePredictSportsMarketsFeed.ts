import { useSportsMarketsFeed } from '../../Predict/trending/useSportsMarketsFeed';
import { toTrendingMarkets } from './internal/legacyMarkets';
import type { PredictSportsMarketsFeed } from './types';
import { usePredictTrendingSupported } from './usePredictTrendingSupported';

const noop = () => undefined;
const resolved = async () => undefined;

const UNSUPPORTED: PredictSportsMarketsFeed = {
  pills: [],
  activeKey: '',
  select: noop,
  active: {
    marketData: [],
    isFetching: false,
    isFetchingMore: false,
    error: null,
    hasMore: false,
    refetch: resolved,
    fetchMore: resolved,
  },
  isLoading: false,
  refetch: resolved,
};

interface UsePredictSportsMarketsFeedOptions {
  /** Explore's pull-to-refresh trigger. */
  refresh?: { trigger: number; silentRefresh: boolean };
}

/**
 * The Sports tab's All Sports list. The legacy branch passes
 * `useSportsMarketsFeed` through unchanged: its pills, lazy per-sport fetches,
 * pagination and refresh. While the Active Venue resolves, and for next
 * Venues, it has no pills and no markets and the legacy hook stays disabled:
 * its sports are Polymarket tags, not Feed keys a next Venue can map. Callers
 * leave the list out while `usePredictTrendingSupported('allSports')` is
 * false.
 */
export const usePredictSportsMarketsFeed = ({
  refresh,
}: UsePredictSportsMarketsFeedOptions = {}): PredictSportsMarketsFeed => {
  const isSupported = usePredictTrendingSupported('allSports');
  const legacy = useSportsMarketsFeed({ refresh, enabled: isSupported });

  if (!isSupported) return UNSUPPORTED;
  return {
    ...legacy,
    active: {
      ...legacy.active,
      marketData: toTrendingMarkets(legacy.active.marketData),
    },
  };
};
