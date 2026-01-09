import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { CaipChainId } from '@metamask/utils';
import { searchTokens } from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

const SEARCH_DEBOUNCE_DELAY = 300;

interface SearchResult {
  assetId: CaipChainId;
  decimals: number;
  name: string;
  symbol: string;
  marketCap: number;
  aggregatedUsdVolume: number;
  price: string;
  pricePercentChange1d: string;
}

/**
 * Hook for handling search tokens request with debouncing to prevent excessive API calls
 * @returns {Object} An object containing the search results, loading state, and a function to trigger search
 */
export const useSearchRequest = (options: {
  chainIds?: CaipChainId[];
  query: string;
  limit: number;
  includeMarketData?: boolean;
}) => {
  const {
    chainIds: providedChainIds = [],
    query,
    limit,
    includeMarketData,
  } = options;

  // Use provided chainIds or default to trending networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return TRENDING_NETWORKS_LIST.map((network) => network.caipChainId);
  }, [providedChainIds]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-fetching
  const stableChainIds = useStableArray(chainIds);

  // Debounce the query to prevent excessive API calls when typing fast
  useEffect(() => {
    // If query is empty, update immediately without debounce
    if (!query) {
      setDebouncedQuery(query);
      return;
    }

    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, SEARCH_DEBOUNCE_DELAY);

    return () => clearTimeout(timer);
  }, [query]);

  const searchTokensRequest = useCallback(async () => {
    if (!debouncedQuery) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchTokens(stableChainIds, debouncedQuery, {
        limit,
        includeMarketData,
      });
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setResults((searchResults?.data as SearchResult[]) || []);
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
        setIsLoading(false);
      }
    }
  }, [stableChainIds, debouncedQuery, limit, includeMarketData]);

  // Automatically trigger search when debounced query changes
  useEffect(() => {
    searchTokensRequest();
  }, [searchTokensRequest]);

  // Show loading state when query is being debounced (user is typing)
  const isDebouncing = query !== debouncedQuery;

  return {
    results,
    isLoading: isLoading || isDebouncing,
    error,
    search: searchTokensRequest,
  };
};
