import { useMemo, useState, useEffect, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { SortTrendingBy } from '@metamask/assets-controllers';
import { useSearchRequest } from '../useSearchRequest/useSearchRequest';
import { useTrendingRequest } from '../useTrendingRequest/useTrendingRequest';
import { sortTrendingTokens } from '../../utils/sortTrendingTokens';
import { PriceChangeOption } from '../../components/TrendingTokensBottomSheet';
import { isEqual } from 'lodash';

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
 * @returns Trending/search results, loading state, and refetch function
 */
export const useTrendingSearch = (opts?: {
  searchQuery?: string;
  sortBy?: SortTrendingBy;
  chainIds?: CaipChainId[] | null;
  enableDebounce?: boolean;
}) => {
  const {
    searchQuery,
    sortBy,
    chainIds,
    enableDebounce = true,
  } = useStableReference(opts ?? {});

  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);

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
  const { results: searchResults, isLoading: isSearchLoading } =
    useSearchRequest({
      query: debouncedQuery || '',
      limit: 20,
      chainIds: chainIds ?? undefined,
      includeMarketData: true,
    });

  const {
    results: trendingResults,
    isLoading: isTrendingLoading,
    fetch: fetchTrendingTokens,
  } = useTrendingRequest({
    sortBy,
    chainIds: chainIds ?? undefined,
  });

  const data = useMemo(() => {
    if (!debouncedQuery?.trim()) {
      return sortTrendingTokens(trendingResults, PriceChangeOption.PriceChange);
    }

    const query = debouncedQuery.toLowerCase().trim();
    const filteredTrendingResults = trendingResults.filter(
      (item) =>
        item.symbol?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query),
    );

    const resultMap = new Map(
      filteredTrendingResults.map((result) => [result.assetId, result]),
    );

    searchResults.forEach((asset) => {
      if (!resultMap.has(asset.assetId)) {
        resultMap.set(asset.assetId, {
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
        });
      }
    });

    return Array.from(resultMap.values());
  }, [debouncedQuery, trendingResults, searchResults]);

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

  return { data, isLoading, refetch: fetchTrendingTokens };
};
