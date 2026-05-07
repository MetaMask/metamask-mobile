import { useMemo } from 'react';
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
}

/** Trending tokens feed; same source for the home list, "crypto movers" pills, and search. */
export const useTokensFeed = ({
  query,
  refresh,
  hideRiskyTokens = false,
}: UseTokensFeedOptions = {}): UseTokensFeedResult => {
  const { data, isLoading, refetch } = useTrendingSearch({
    searchQuery: query,
    enableDebounce: false,
  });

  useFeedRefresh(refresh, refetch);

  const filteredData = useMemo(() => {
    const searched = fuseSearch(
      data,
      query,
      TOKEN_FUSE_OPTIONS,
      (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
    );

    if (!hideRiskyTokens) return searched;

    return searched.filter(({ securityData }) => {
      const { resultType } = securityData ?? {};
      return (
        !resultType || resultType === 'Verified' || resultType === 'Benign'
      );
    });
  }, [data, query, hideRiskyTokens]);

  return { data: filteredData, isLoading, refetch };
};
