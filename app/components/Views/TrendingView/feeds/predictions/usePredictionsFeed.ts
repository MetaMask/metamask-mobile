import { useMemo, useRef } from 'react';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';
import { usePredictMarketData } from '../../../../UI/Predict/hooks/usePredictMarketData';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { fuseSearch, PREDICTIONS_FUSE_OPTIONS } from '../search-utils';

export type PredictionsVariant = 'trending' | 'sports' | 'crypto' | 'politics';

interface UsePredictionsFeedOptions {
  /** @default 'trending' */
  variant?: PredictionsVariant;
  query?: string;
  refresh?: RefreshConfig;
}

export interface UsePredictionsFeedResult {
  data: PredictMarketType[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  fetchMore?: () => Promise<void>;
  isFetchingMore?: boolean;
  hasMore?: boolean;
}

/** Predict markets feed; one shape covers home tabs and search via the variant + query knobs. */
export const usePredictionsFeed = ({
  variant = 'trending',
  query,
  refresh,
}: UsePredictionsFeedOptions = {}): UsePredictionsFeedResult => {
  const {
    marketData,
    isFetching,
    isFetchingMore,
    hasMore,
    refetch,
    fetchMore,
  } = usePredictMarketData({
    category: variant,
    pageSize: query ? 20 : 6,
    q: query || undefined,
  });

  useFeedRefresh(refresh, refetch);

  const prevQueryRef = useRef(query);
  const baseDataRef = useRef<PredictMarketType[]>([]);

  const filteredData = useMemo(() => {
    const queryChanged = prevQueryRef.current !== query;
    prevQueryRef.current = query;

    if (queryChanged) {
      // New query → re-rank everything from scratch
      const ranked = fuseSearch(marketData, query, PREDICTIONS_FUSE_OPTIONS);
      baseDataRef.current = ranked;
      return ranked;
    }

    // Same query, new page appended: only rank the genuinely new items and
    // append them after the already-ranked items to keep stable ordering.
    const existingIds = new Set(baseDataRef.current.map((m) => m.id));
    const newItems = marketData.filter((m) => !existingIds.has(m.id));
    if (newItems.length === 0) return baseDataRef.current;

    const rankedNew = fuseSearch(newItems, query, PREDICTIONS_FUSE_OPTIONS);
    const combined = [...baseDataRef.current, ...rankedNew];
    baseDataRef.current = combined;
    return combined;
  }, [marketData, query]);

  return {
    data: filteredData,
    isLoading: isFetching,
    refetch,
    fetchMore,
    isFetchingMore,
    hasMore,
  };
};
