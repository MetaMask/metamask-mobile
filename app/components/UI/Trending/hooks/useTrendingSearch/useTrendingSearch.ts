import { useMemo, useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
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
import { selectExploreLaptopSearchApiRankingEnabled } from '../../selectors/featureFlags';
import { usesTemporaryApiRanking } from '../../utils/usesTemporaryApiRanking';
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
    sortTrendingTokensOptions = {
      option: PriceChangeOption.PriceChange,
      direction: SortDirection.Descending,
    },
  } = useStableReference(opts ?? {});

  const isLaptopApiRankingEnabled = useSelector(
    selectExploreLaptopSearchApiRankingEnabled,
  );
  const [debouncedQuery, setDebouncedQuery] = useState(searchQuery);
  const searchRequestQuery = usesTemporaryApiRanking(
    debouncedQuery,
    isLaptopApiRankingEnabled,
  )
    ? (debouncedQuery?.trim().replace(/^\$/, '') ?? '')
    : debouncedQuery || '';

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

    const query = debouncedQuery.toLowerCase().trim();
    const trendingMatches = trendingResults.filter(
      (item) =>
        item.symbol?.toLowerCase().includes(query) ||
        item.name?.toLowerCase().includes(query),
    );
    const trendingByAssetId = new Map(
      trendingMatches.map((result) => [result.assetId, result]),
    );

    // TEMPORARY: Preserve API ranking only for the LAPTOP launch. All other
    // queries retain the existing trending-first merge behavior.
    const preserveApiRanking = usesTemporaryApiRanking(
      debouncedQuery,
      isLaptopApiRankingEnabled,
    );
    const resultMap = new Map<string, TrendingAsset>(
      preserveApiRanking
        ? []
        : trendingMatches.map((result) => [result.assetId, result]),
    );

    searchResults
      .filter((item) => includeStocks || !item.rwaData)
      .forEach((asset) => {
        resultMap.set(
          asset.assetId,
          trendingByAssetId.get(asset.assetId) ?? {
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
          },
        );
      });

    trendingMatches.forEach((item) => {
      if (!resultMap.has(item.assetId)) {
        resultMap.set(item.assetId, item);
      }
    });

    return Array.from(resultMap.values());
  }, [
    debouncedQuery,
    isLaptopApiRankingEnabled,
    trendingResults,
    searchResults,
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
