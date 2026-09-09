import { useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import {
  mapTimeOptionToSortBy,
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';

interface UseTokensFeedOptions {
  /** Search query; when present, results keep the order returned by the search API. */
  query?: string;
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
    if (!hideRiskyTokens) return data;

    return data.filter(({ securityData }) => {
      const { resultType } = securityData ?? {};
      return (
        !resultType || resultType === 'Verified' || resultType === 'Benign'
      );
    });
  }, [data, hideRiskyTokens]);

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
