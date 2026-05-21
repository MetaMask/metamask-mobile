import { useMemo, useRef, useEffect } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
import { fuseSearch, TOKEN_FUSE_OPTIONS } from '../search-utils';

interface UseTokensFeedOptions {
  /** Search query; when present, results are sorted by market cap descending. */
  query?: string;
  refresh?: RefreshConfig;
  /**
   * When true, only Verified and Benign tokens (or unscanned ones) are shown.
   * Use for surfaces that don't display a security badge.
   */
  hideRiskyTokens?: boolean;
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
}: UseTokensFeedOptions = {}): UseTokensFeedResult => {
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
  });

  useFeedRefresh(refresh, refetch);

  /**
   * firstPageSizeRef records how many items were in the first page response so
   * that subsequent pages can be appended without resorting. A single effect
   * handles both concerns: reset on query change (and bail out immediately so
   * a stale data.length is never captured on the same render), then capture the
   * boundary once the initial load settles.
   */
  const firstPageSizeRef = useRef<number | null>(null);
  const prevQueryRef = useRef(query);

  useEffect(() => {
    if (prevQueryRef.current !== query) {
      firstPageSizeRef.current = null;
      prevQueryRef.current = query;
      return;
    }
    if (!isLoading && !isLoadingMore && firstPageSizeRef.current === null) {
      firstPageSizeRef.current = data.length;
    }
  }, [query, isLoading, isLoadingMore, data.length]);

  const filteredData = useMemo(() => {
    let searched: TrendingAsset[];

    if (query?.trim()) {
      // Sort only the first-page slice; subsequent pages are appended as-is so
      // that pagination order is preserved rather than interleaved by market cap.
      const boundary = firstPageSizeRef.current ?? data.length;
      const firstPage = data
        .slice(0, boundary)
        .sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0));
      const rest = data.slice(boundary);
      searched = [...firstPage, ...rest];
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
    // firstPageSizeRef is a ref — intentionally excluded from deps so that
    // boundary captures the snapshot set by the effect, not a stale closure.
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
