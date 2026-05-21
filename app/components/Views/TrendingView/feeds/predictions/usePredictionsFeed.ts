import { useMemo } from 'react';
import type { PredictMarket as PredictMarketType } from '../../../../UI/Predict/types';
import { usePredictMarketData } from '../../../../UI/Predict/hooks/usePredictMarketData';
import { usePredictSearchMarketData } from '../../../../UI/Predict/hooks/usePredictSearchMarketData';
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
  const hasQuery = Boolean(query?.trim());
  const feed = usePredictMarketData({
    category: variant,
    pageSize: 6,
    enabled: !hasQuery,
  });
  const search = usePredictSearchMarketData({
    q: query ?? '',
    pageSize: 20,
    enabled: hasQuery,
  });

  const activeResult = hasQuery ? search : feed;

  useFeedRefresh(refresh, activeResult.refetch);

  const filteredData = useMemo(
    () => fuseSearch(activeResult.marketData, query, PREDICTIONS_FUSE_OPTIONS),
    [activeResult.marketData, query],
  );

  return {
    data: filteredData,
    isLoading: activeResult.isFetching,
    refetch: activeResult.refetch,
    fetchMore: hasQuery ? undefined : feed.fetchMore,
    isFetchingMore: hasQuery ? undefined : feed.isFetchingMore,
    hasMore: hasQuery ? undefined : feed.hasMore,
  };
};
