import { useMemo, useState, useEffect } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { fuseSearch, TOKEN_FUSE_OPTIONS } from '../search-utils';
import {
  mapTimeOptionToSortBy,
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../../../UI/Trending/components/TrendingTokensBottomSheet';

interface UseTokensFeedOptions {
  /** Search query; when present, results are sorted by market cap descending. */
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

  /**
   * How many items the first page response held, so that subsequent pages can
   * be appended without resorting. Recorded together with the query it was
   * measured for: once the query changes the boundary no longer applies, and
   * the whole list is sorted again until the new first page settles.
   */
  const [firstPage, setFirstPage] = useState<{
    query?: string;
    size: number | null;
  }>({ query, size: null });

  useEffect(() => {
    if (isLoading || isLoadingMore) {
      return;
    }
    setFirstPage((previous) =>
      previous.query === query && previous.size !== null
        ? previous
        : { query, size: data.length },
    );
  }, [query, isLoading, isLoadingMore, data.length]);

  const filteredData = useMemo(() => {
    let searched: TrendingAsset[];

    if (query?.trim()) {
      // Sort only the first-page slice; subsequent pages are appended as-is so
      // that pagination order is preserved rather than interleaved by market cap.
      const boundary =
        firstPage.query === query && firstPage.size !== null
          ? firstPage.size
          : data.length;
      const firstPageAssets = data
        .slice(0, boundary)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
      const rest = data.slice(boundary);
      searched = [...firstPageAssets, ...rest];
    } else {
      searched = fuseSearch(
        data,
        query,
        TOKEN_FUSE_OPTIONS,
        (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
      );
    }

    if (!hideRiskyTokens) return searched;

    return searched.filter(({ securityData }) => {
      const { resultType } = securityData ?? {};
      return (
        !resultType || resultType === 'Verified' || resultType === 'Benign'
      );
    });
  }, [data, query, hideRiskyTokens, firstPage]);

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
