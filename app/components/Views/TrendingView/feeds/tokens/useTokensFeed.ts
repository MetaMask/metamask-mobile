import { useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { fuseSearch, TOKEN_FUSE_OPTIONS } from '../search-utils';
import type { SearchRequestPerformance } from '../../../../../util/searchPerformance';
import {
  mapTimeOptionToSortBy,
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';

interface UseTokensFeedOptions {
  /** Search query; results are displayed in the API relevance order. */
  query?: string;
  performance?: SearchRequestPerformance;
  refresh?: RefreshConfig;
  /**
   * When true, only Verified and Benign tokens (or unscanned ones) are shown.
   * Use for surfaces that don't display a security badge.
   */
  hideRiskyTokens?: boolean;
  /** Time option used for request and local price-change sorting. */
  timeOption?: TimeOption;
}

export interface UseTokensFeedResult {
  data: TrendingAsset[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  loadMore?: () => void;
  isLoadingMore?: boolean;
  hasMore?: boolean;
  totalCount?: number;
}

/** Trending tokens feed; same source for the home list, "crypto movers" pills, and search. */
export const useTokensFeed = ({
  query,
  performance,
  refresh,
  hideRiskyTokens = false,
  timeOption,
}: UseTokensFeedOptions = {}): UseTokensFeedResult => {
  const sortBy = timeOption ? mapTimeOptionToSortBy(timeOption) : undefined;

  const {
    data,
    isLoading,
    refetch,
    loadMore,
    isLoadingMore,
    hasNextPage,
    totalCount,
  } = useTrendingSearch({
    searchQuery: query,
    enableDebounce: false,
    ...(performance ? { performance } : {}),
    sortBy,
    filterLowQuality: true,
    sortTrendingTokensOptions: timeOption
      ? {
          option: PriceChangeOption.PriceChange,
          direction: SortDirection.Descending,
          timeOption,
        }
      : undefined,
  });

  useFeedRefresh(refresh, refetch);

  const filteredData = useMemo(() => {
    // Search results are displayed in the API relevance order — no
    // client-side re-sort (mirrors the extension's discover-search change).
    // The no-query trending list keeps its existing behavior.
    const searched = query?.trim()
      ? data
      : fuseSearch(data, query, TOKEN_FUSE_OPTIONS);

    if (!hideRiskyTokens) return searched;

    return searched.filter(({ securityData }) => {
      const { resultType } = securityData ?? {};
      return (
        !resultType || resultType === 'Verified' || resultType === 'Benign'
      );
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, query, hideRiskyTokens]);

  return {
    data: filteredData,
    isLoading,
    refetch,
    loadMore: query ? loadMore : undefined,
    isLoadingMore: query ? isLoadingMore : undefined,
    hasMore: query ? hasNextPage : undefined,
    totalCount: query ? totalCount : undefined,
  };
};
