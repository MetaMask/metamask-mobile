import { usePredictionsFeed } from '../../Predict/trending/usePredictionsFeed';
import { PREDICT_SURFACE_FEED_KEYS } from '../capabilities';
import { usePredictImplementation } from '../implementation';
import { toTrendingMarkets } from './internal/legacyMarkets';
import { useNextTrendingFeed } from './internal/next/useNextTrendingFeed';
import type {
  PredictTrendingFeed,
  UsePredictTrendingFeedOptions,
} from './types';

const UNSUPPORTED: PredictTrendingFeed = {
  data: [],
  isLoading: false,
  refetch: async () => undefined,
};

/**
 * Predict markets for an Explore tab's section, or search results when
 * `query` is set. Both implementations' hooks always run; only the active
 * one is enabled, so a Venue change swaps the markets on the same render and
 * the other implementation reads nothing.
 *
 * The legacy lane passes `usePredictionsFeed` through unchanged (ranking,
 * Fuse filtering, pagination and refresh) for the tab's Feed key, which
 * names the legacy feed category. A next Venue reads the Feed the tab's key
 * maps to in its descriptor, or nothing when it lacks the key, and searches
 * with `useSearchEvents`. While the Active Venue resolves: empty, and
 * nothing is read.
 */
export const usePredictTrendingFeed = ({
  tab = 'now',
  query,
  performance,
  refresh,
  enabled = true,
}: UsePredictTrendingFeedOptions = {}): PredictTrendingFeed => {
  const resolution = usePredictImplementation();
  const isLegacy =
    resolution.status === 'ready' && resolution.implementation === 'legacy';
  const nextVenueId =
    resolution.status === 'ready' && resolution.implementation === 'next'
      ? resolution.venueId
      : undefined;

  const legacy = usePredictionsFeed({
    variant: PREDICT_SURFACE_FEED_KEYS.exploreTabs[tab],
    query,
    performance,
    refresh,
    enabled: enabled && isLegacy,
  });
  const next = useNextTrendingFeed({
    venueId: nextVenueId,
    tab,
    query,
    refresh,
    enabled,
  });

  if (isLegacy) {
    return { ...legacy, data: toTrendingMarkets(legacy.data) };
  }
  return nextVenueId === undefined ? UNSUPPORTED : next;
};
