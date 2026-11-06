import { useMemo, useState, useEffect, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { SortTrendingBy, TrendingAsset } from '@metamask/assets-controllers';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { useTrendingRequest } from '../useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import {
  PriceChangeOption,
  SortDirection,
  TimeOption,
} from '../../components/TrendingTokensBottomSheet';
import { isEqual } from 'lodash';
import type { SearchRequestPerformance } from '../../../../../util/searchPerformance';

const useStableReference = <T>(value: T) => {
  const [stableValue, setStableValue] = useState(value);

  useEffect(() => {
    if (!isEqual(stableValue, value)) {
      setStableValue(value);
    }
  }, [value, stableValue]);

  return stableValue;
};

/**
 * Hook for trending tokens search with optional debouncing.
 *
 * @param searchQuery - Search query string
 * @param sortBy - Sort option for trending tokens
 * @param chainIds - Chain IDs to filter by
 * @param enableDebounce - Whether to debounce (default: true)
 * @param includeStocks - When true, items with rwaData are included in results (default: false)
 * @returns Trending/search results, loading state, and refetch function
 */
export const useTrendingSearch = (opts?: {
  searchQuery?: string;
  sortBy?: SortTrendingBy;
  chainIds?: CaipChainId[] | null;
  enableDebounce?: boolean;
  includeMarketData?: boolean;
  includeStocks?: boolean;
  filterLowQuality?: boolean;
  performance?: SearchRequestPerformance;
  sortTrendingTokensOptions?: {
    option: PriceChangeOption;
    direction: SortDirection;
    timeOption?: TimeOption;
  };
}) => {
  const {
    searchQuery,
    sortBy,
    chainIds,
    enableDebounce = true,
    includeMarketData = true,
    includeStocks = false,
    filterLowQuality = false,
    performance,
    sortTrendingTokensOptions = {
      option: PriceChangeOption.PriceChange,
      direction: SortDirection.Descending,
    },
  } = useStableReference(opts ?? {});

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  // An optional ticker-style "$" prefix is stripped from the search query.
  // This was previously gated behind the temporary LAPTOP API-ranking fork,
  // now unconditional.
  const searchRequestQuery = debouncedQuery?.trim().replace(/^\$/, '') ?? '';

  // Debounce the search query
  useEffect(() => {
    if (!enableDebounce) {
      setDebouncedQuery(searchQuery);
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 200);
    return () => clearTimeout(timer);
  }, [searchQuery, enableDebounce]);

  // There is a chance you will get 0 results
  const {
    results: searchResults,
    isLoading: isSearchLoading,
    loadMore,
    isLoadingMore,
    hasNextPage,
    totalCount,
  } = useSearchRequest({
    query: searchRequestQuery,
    limit: 20,
    chainIds: chainIds ?? undefined,
    includeMarketData,
    performance,
  });

  const {
    results: trendingResults,
    isLoading: isTrendingLoading,
    fetch: fetchTrendingTokens,
  } = useTrendingRequest({
    sort: sortBy,
    chainIds: chainIds ?? undefined,
    filterLowQuality,
  });

  const data = useMemo(() => {
    if (!debouncedQuery?.trim()) {
      return sortTrendingTokens(
        trendingResults,
        sortTrendingTokensOptions.option,
        sortTrendingTokensOptions.direction,
        sortTrendingTokensOptions.timeOption,
      );
    }

    // Search results are displayed in the API's relevance order — no
    // client-side merge with the trending list and no re-sort (mirrors the
    // extension's discover-search change). The API's own result objects are
    // shown, so a duplicate assetId is no longer replaced by the trending
    // list's copy.
    return searchResults
      .filter((item) => includeStocks || !item.rwaData)
      .map((asset) => ({
        assetId: asset.assetId,
        symbol: asset.symbol,
        name: asset.name,
        decimals: asset.decimals,
        price: asset.price,
        aggregatedUsdVolume: asset.aggregatedUsdVolume,
        marketCap: asset.marketCap,
        priceChangePct: {
          h24: asset.pricePercentChange1d,
        },
        rwaData: asset.rwaData as unknown as
          | TrendingAsset['rwaData']
          | undefined,
        securityData: asset.securityData,
      }));
  }, [
    debouncedQuery,
    searchResults,
    trendingResults,
    sortTrendingTokensOptions,
    includeStocks,
  ]);

  // Loading state: show loading while waiting for results
  const prevDebouncedQuery = useRef(debouncedQuery);
  useEffect(() => {
    prevDebouncedQuery.current = debouncedQuery;
  });

  const isLoading = debouncedQuery?.trim()
    ? searchQuery !== debouncedQuery ||
      prevDebouncedQuery.current !== debouncedQuery ||
      isSearchLoading
    : isTrendingLoading;

  return {
    data,
    isLoading,
    refetch: fetchTrendingTokens,
    loadMore,
    isLoadingMore,
    hasNextPage,
    totalCount: debouncedQuery?.trim() ? totalCount : undefined,
  };
};
