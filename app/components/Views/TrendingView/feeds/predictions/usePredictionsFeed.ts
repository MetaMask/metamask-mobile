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

  let data: PredictMarketType[];

  if (prevQueryRef.current !== query) {
    // Query changed: usePredictMarketData clears marketData via a useEffect
    // (after render), so it still holds the previous query's data here.
    // Wipe baseDataRef immediately to avoid contaminating the new query's results.
    prevQueryRef.current = query;
    baseDataRef.current = [];
    data = [];
  } else if (isFetching && marketData.length === 0) {
    // First page in-flight — hold whatever is already ranked (empty on first load).
    data = baseDataRef.current;
  } else {
    const existingIds = new Set(baseDataRef.current.map((m) => m.id));
    const newItems = marketData.filter((m) => !existingIds.has(m.id));

    if (newItems.length > 0) {
      // Pagination: rank only the new page and append, preserving existing order.
      baseDataRef.current = [
        ...baseDataRef.current,
        ...fuseSearch(newItems, query, PREDICTIONS_FUSE_OPTIONS),
      ];
    } else {
      // Refresh: same IDs, updated values — patch in-place to keep sort order.
      const freshById = new Map(marketData.map((m) => [m.id, m]));
      baseDataRef.current = baseDataRef.current.map(
        (m) => freshById.get(m.id) ?? m,
      );
    }

    data = baseDataRef.current;
  }

  return {
    data,
    isLoading: isFetching,
    refetch,
    fetchMore,
    isFetchingMore,
    hasMore,
  };
};
