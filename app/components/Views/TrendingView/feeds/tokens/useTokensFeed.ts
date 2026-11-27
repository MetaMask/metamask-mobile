import { useMemo } from 'react';
import type { TrendingAsset } from '@metamask/assets-controllers';
import { useTrendingSearch } from '../../../../UI/Trending/hooks/useTrendingSearch/useTrendingSearch';
import { useFeedRefresh } from '../../hooks/useFeedRefresh';
import type { RefreshConfig } from '../../hooks/useExploreRefresh';
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
  /** When false, skip token feed requests while retaining hook stability. */
  enabled?: boolean;
  performance?: SearchRequestPerformance;
  refresh?: RefreshConfig;
  /**
   * When true (default), the default list shown while the search box is
   * empty hides Warning, Spam, and Malicious tokens. Typed-search results
   * are never filtered. Set to false on surfaces that must list every token.
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

/**
 * Removes tokens whose security verdict is Warning, Spam, or Malicious.
 * Verified, Benign, and unscanned tokens are kept.
 */
export const filterRiskyTokens = (tokens: TrendingAsset[]): TrendingAsset[] =>
  tokens.filter(({ securityData }) => {
    const { resultType } = securityData ?? {};
    return !resultType || resultType === 'Verified' || resultType === 'Benign';
  });

/** Trending tokens feed; same source for the home list, "crypto movers" pills, and search. */
export const useTokensFeed = ({
  query,
  enabled = true,
  performance,
  refresh,
  hideRiskyTokens = true,
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
    ...(enabled ? {} : { enabled: false }),
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

  const filteredData = useMemo(
    () => (hideRiskyTokens && !query?.trim() ? filterRiskyTokens(data) : data),
    [data, hideRiskyTokens, query],
  );

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
