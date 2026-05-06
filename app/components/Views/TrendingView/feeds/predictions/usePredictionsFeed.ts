import { useMemo } from 'react';
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
}

/** Predict markets feed; one shape covers home tabs and search via the variant + query knobs. */
export const usePredictionsFeed = ({
  variant = 'trending',
  query,
  refresh,
}: UsePredictionsFeedOptions = {}): UsePredictionsFeedResult => {
  const { marketData, isFetching, refetch } = usePredictMarketData({
    category: variant,
    pageSize: query ? 20 : 6,
    q: query || undefined,
  });

  useFeedRefresh(refresh, refetch);

  const filteredData = useMemo(
    () => fuseSearch(marketData, query, PREDICTIONS_FUSE_OPTIONS),
    [marketData, query],
  );

  return { data: filteredData, isLoading: isFetching, refetch };
};
