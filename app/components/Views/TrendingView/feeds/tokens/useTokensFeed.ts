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
}: UseTokensFeedOptions = {}): UseTokensFeedResult => {
  const { data, isLoading, refetch } = useTrendingSearch({
    searchQuery: query,
    enableDebounce: false,
  });

  useFeedRefresh(refresh, refetch);

  const filteredData = useMemo(
    () =>
      fuseSearch(
        data,
        query,
        TOKEN_FUSE_OPTIONS,
        (a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0),
      ),
    [data, query],
  );

  return { data: filteredData, isLoading, refetch };
};
