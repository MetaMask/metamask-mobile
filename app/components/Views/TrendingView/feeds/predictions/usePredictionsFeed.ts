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
  /**
   * Number of markets to fetch per page. Applies to both the no-query trending
   * fetch and the search fetch. Defaults to 6 for home-tab previews.
   */
  pageSize?: number;
}

export interface UsePredictionsFeedResult {
  data: PredictMarketType[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  /** Total result count from the server; only set when a search query is active. */
  total?: number;
}

/** Predict markets feed; one shape covers home tabs and search via the variant + query knobs. */
export const usePredictionsFeed = ({
  variant = 'trending',
  query,
  refresh,
  pageSize = 6,
}: UsePredictionsFeedOptions = {}): UsePredictionsFeedResult => {
  const hasQuery = Boolean(query?.trim());
  const feed = usePredictMarketData({
    category: variant,
    pageSize,
    enabled: !hasQuery,
  });
  const search = usePredictSearchMarketData({
    q: query ?? '',
    pageSize,
    enabled: hasQuery,
  });

  const activeResult = hasQuery ? search : feed;

  useFeedRefresh(refresh, activeResult.refetch);

  // When a search query is active, results are already server-ranked by
  // relevance — skip Fuse re-ranking to preserve server order across pages.
  const data = hasQuery
    ? activeResult.marketData
    : fuseSearch(activeResult.marketData, query, PREDICTIONS_FUSE_OPTIONS);

  return {
    data,
    isLoading: activeResult.isFetching,
    refetch: activeResult.refetch,
    fetchMore: hasQuery ? search.fetchMore : feed.fetchMore,
    isFetchingMore: hasQuery ? search.isFetchingMore : feed.isFetchingMore,
    hasMore: hasQuery ? search.hasMore : feed.hasMore,
    total: hasQuery ? search.totalResults : undefined,
  };
};
