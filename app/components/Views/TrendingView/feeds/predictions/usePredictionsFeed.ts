import { useRef } from 'react';
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

  // Compute filteredData synchronously during render (derived-state pattern) so
  // that data and isLoading are always consistent in the same render cycle.
  // Using useEffect + setState would leave a frame where isLoading=false but
  // data=[] because the effect fires after the render, causing the section to
  // flicker out of the aggregated results list.
  let filteredData: PredictMarketType[];

  const queryChanged = prevQueryRef.current !== query;

  if (queryChanged) {
    // New query → re-rank everything from scratch
    const ranked = fuseSearch(marketData, query, PREDICTIONS_FUSE_OPTIONS);
    prevQueryRef.current = query;
    baseDataRef.current = ranked;
    filteredData = ranked;
  } else {
    const existingIds = new Set(baseDataRef.current.map((m) => m.id));
    const newItems = marketData.filter((m) => !existingIds.has(m.id));

    if (newItems.length > 0) {
      // Pagination: rank and append genuinely new items, preserving existing order.
      const rankedNew = fuseSearch(newItems, query, PREDICTIONS_FUSE_OPTIONS);
      baseDataRef.current = [...baseDataRef.current, ...rankedNew];
    } else {
      // Refresh: same IDs, updated values — patch in-place to avoid stale data.
      const freshById = new Map(marketData.map((m) => [m.id, m]));
      baseDataRef.current = baseDataRef.current.map(
        (m) => freshById.get(m.id) ?? m,
      );
    }

    filteredData = baseDataRef.current;
  }

  return {
    data: filteredData,
    isLoading: isFetching,
    refetch,
    fetchMore,
    isFetchingMore,
    hasMore,
  };
};
