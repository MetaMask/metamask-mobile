import { usePredictionsFeed } from '../../Predict/trending/usePredictionsFeed';
import { toTrendingMarkets } from './internal/legacyMarkets';
import type {
  PredictTrendingFeed,
  UsePredictTrendingFeedOptions,
} from './types';
import { usePredictTrendingSupported } from './usePredictTrendingSupported';

const UNSUPPORTED: PredictTrendingFeed = {
  data: [],
  isLoading: false,
  refetch: async () => undefined,
};

/**
 * Predict markets for an Explore section, or search results when `query` is
 * set. The legacy branch passes `usePredictionsFeed` through unchanged:
 * ranking, Fuse filtering, pagination and refresh. While the Active Venue
 * resolves, and for next Venues until PRED-1408, the feed is empty and the
 * legacy hook stays disabled, so the section is left out and no legacy
 * market is read.
 */
export const usePredictTrendingFeed = ({
  enabled = true,
  ...options
}: UsePredictTrendingFeedOptions = {}): PredictTrendingFeed => {
  const isSupported = usePredictTrendingSupported();
  const legacy = usePredictionsFeed({
    ...options,
    enabled: enabled && isSupported,
  });

  if (!isSupported) return UNSUPPORTED;
  return { ...legacy, data: toTrendingMarkets(legacy.data) };
};
