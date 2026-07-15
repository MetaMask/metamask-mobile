import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { CaipChainId } from '@metamask/utils';
import {
  searchTokens,
  TrendingAsset,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

interface SearchResult {
  assetId: CaipChainId;
  decimals: number;
  name: string;
  symbol: string;
  marketCap: number;
  aggregatedUsdVolume: number;
  price: string;
  pricePercentChange1d: string;
  rwaData?: TrendingAsset['rwaData'];
  securityData?: TokenSecurityData;
}

const DEBOUNCE_MS = 300;

/**
 * Hook for handling search tokens request
 * @returns {Object} An object containing the search results, loading state, and a function to trigger search
 */
export const useSearchRequest = (options: {
  chainIds?: CaipChainId[];
  query: string;
  limit: number;
  includeMarketData?: boolean;
  /** Whether to debounce the query (default: false). */
  enableDebounce?: boolean;
}) => {
  const {
    chainIds: providedChainIds = [],
    query,
    limit,
    includeMarketData,
    enableDebounce = false,
  } = options;

  // Use provided chainIds or default to trending networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return TRENDING_NETWORKS_LIST.map((network) => network.caipChainId);
  }, [providedChainIds]);

  // Debounce the query when enabled to avoid firing API calls on every keystroke
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    if (!enableDebounce) {
      setDebouncedQuery(query);
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(query), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query, enableDebounce]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [endCursor, setEndCursor] = useState<string | undefined>();
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState<number | undefined>();

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);
  // Ref-based guard ensures only one loadMore fetch runs at a time even if
  // FlashList fires onEndReached multiple times before the state update lands
  const isLoadingMoreRef = useRef(false);

  // Stabilize the chainIds array reference to prevent unnecessary re-fetching
  const stableChainIds = useStableArray(chainIds);

  const searchTokensRequest = useCallback(async () => {
    if (!debouncedQuery) {
      setResults([]);
      setError(null);
      setIsFetching(false);
      setEndCursor(undefined);
      setHasNextPage(false);
      setTotalCount(undefined);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsFetching(true);
    setError(null);
    setEndCursor(undefined);
    setHasNextPage(false);
    setTotalCount(undefined);

    try {
      const searchResults = await searchTokens(stableChainIds, debouncedQuery, {
        limit,
        includeMarketData,
        includeTokenSecurityData: true,
      });
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setResults((searchResults?.data as SearchResult[]) || []);
        setEndCursor(searchResults?.pageInfo?.endCursor ?? undefined);
        setHasNextPage(searchResults?.pageInfo?.hasNextPage ?? false);
        setTotalCount(
          typeof searchResults?.totalCount === 'number'
            ? searchResults.totalCount
            : undefined,
        );
        if (searchResults?.error) {
          setError({ message: searchResults.error, name: 'SearchError' });
        }
      }
    } catch (err) {
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setError(err as Error);
        setResults([]);
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setIsFetching(false);
      }
    }
  }, [stableChainIds, debouncedQuery, limit, includeMarketData]);

  const loadMore = useCallback(async () => {
    if (!hasNextPage || !endCursor || isLoadingMoreRef.current || isFetching)
      return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const more = await searchTokens(stableChainIds, debouncedQuery, {
        limit,
        includeMarketData,
        includeTokenSecurityData: true,
        after: endCursor,
      });
      if (more?.data) {
        setResults((prev) => [...prev, ...(more.data as SearchResult[])]);
      }
      setEndCursor(more?.pageInfo?.endCursor ?? undefined);
      setHasNextPage(more?.pageInfo?.hasNextPage ?? false);
    } catch {
      // Pagination errors are silent; existing results stay intact
    } finally {
      isLoadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [
    hasNextPage,
    endCursor,
    isFetching,
    stableChainIds,
    debouncedQuery,
    limit,
    includeMarketData,
  ]);

  // Automatically trigger search when debounced query changes
  useEffect(() => {
    searchTokensRequest();
  }, [searchTokensRequest]);

  // Track whether debouncedQuery has been processed by the effect yet.
  // On the render where debouncedQuery changes, prevDebouncedQuery still
  // holds the old value, so the check covers the one-frame gap before
  // the effect fires the request.
  const prevDebouncedQuery = useRef(debouncedQuery);
  useEffect(() => {
    prevDebouncedQuery.current = debouncedQuery;
  });

  const isLoading =
    query !== debouncedQuery ||
    prevDebouncedQuery.current !== debouncedQuery ||
    isFetching;

  return {
    results,
    isLoading,
    error,
    search: searchTokensRequest,
    loadMore,
    isLoadingMore,
    hasNextPage,
    totalCount,
  };
};
