import { useCallback, useEffect, useState, useRef } from 'react';
import { CaipChainId } from '@metamask/utils';
import {
  searchTokens,
  TrendingAsset,
  TokenSecurityData,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import { useTrendingChainIds } from '../useTrendingChainIds/useTrendingChainIds';
import type {
  SearchRequestOutcome,
  SearchRequestPerformance,
} from '../../../../../util/searchPerformance';

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
  enabled?: boolean;
  /** Whether to debounce the query (default: false). */
  enableDebounce?: boolean;
  performance?: SearchRequestPerformance;
}) => {
  const {
    chainIds: providedChainIds = [],
    query,
    limit,
    includeMarketData,
    enabled = true,
    enableDebounce = false,
    performance,
  } = options;

  // Use provided chainIds or default to trending networks
  const chainIds = useTrendingChainIds(providedChainIds);

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
  const [isFetching, setIsFetching] = useState(enabled);
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
  const performanceRef = useRef(performance);
  performanceRef.current = performance;

  const searchTokensRequest = useCallback(async () => {
    if (!enabled) {
      requestIdRef.current += 1;
      isLoadingMoreRef.current = false;
      setResults([]);
      setError(null);
      setIsFetching(false);
      setEndCursor(undefined);
      setHasNextPage(false);
      setIsLoadingMore(false);
      setTotalCount(undefined);
      return;
    }

    if (!debouncedQuery) {
      requestIdRef.current += 1;
      isLoadingMoreRef.current = false;
      setResults([]);
      setError(null);
      setIsFetching(false);
      setEndCursor(undefined);
      setHasNextPage(false);
      setIsLoadingMore(false);
      setTotalCount(undefined);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    isLoadingMoreRef.current = false;
    setIsFetching(true);
    setError(null);
    setEndCursor(undefined);
    setHasNextPage(false);
    setIsLoadingMore(false);
    setTotalCount(undefined);

    const requestHandle = performanceRef.current?.startRequest(debouncedQuery);
    let outcome: SearchRequestOutcome = 'success';

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
          outcome = 'error';
          setError({ message: searchResults.error, name: 'SearchError' });
        }
      }
    } catch (err) {
      outcome = 'error';
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
      requestHandle?.end(outcome);
    }
  }, [debouncedQuery, enabled, includeMarketData, limit, stableChainIds]);

  const loadMore = useCallback(async () => {
    if (
      !enabled ||
      !hasNextPage ||
      !endCursor ||
      isLoadingMoreRef.current ||
      isFetching
    )
      return;

    isLoadingMoreRef.current = true;
    setIsLoadingMore(true);
    const currentRequestId = requestIdRef.current;
    try {
      const more = await searchTokens(stableChainIds, debouncedQuery, {
        limit,
        includeMarketData,
        includeTokenSecurityData: true,
        after: endCursor,
      });
      if (currentRequestId !== requestIdRef.current || !enabled) {
        return;
      }
      if (more?.data) {
        setResults((prev) => [...prev, ...(more.data as SearchResult[])]);
      }
      setEndCursor(more?.pageInfo?.endCursor ?? undefined);
      setHasNextPage(more?.pageInfo?.hasNextPage ?? false);
    } catch {
      // Pagination errors are silent; existing results stay intact
    } finally {
      isLoadingMoreRef.current = false;
      if (currentRequestId === requestIdRef.current) {
        setIsLoadingMore(false);
      }
    }
  }, [
    hasNextPage,
    endCursor,
    isFetching,
    stableChainIds,
    debouncedQuery,
    limit,
    includeMarketData,
    enabled,
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
  const prevEnabled = useRef(enabled);
  useEffect(() => {
    prevDebouncedQuery.current = debouncedQuery;
  });
  const isEnabling = enabled && !prevEnabled.current;
  useEffect(() => {
    prevEnabled.current = enabled;
  }, [enabled]);

  const isLoading =
    enabled &&
    (isEnabling ||
      query !== debouncedQuery ||
      prevDebouncedQuery.current !== debouncedQuery ||
      isFetching);

  return {
    results: enabled ? results : [],
    isLoading,
    error: enabled ? error : null,
    search: searchTokensRequest,
    loadMore,
    isLoadingMore: enabled && isLoadingMore,
    hasNextPage: enabled && hasNextPage,
    totalCount: enabled ? totalCount : undefined,
  };
};
