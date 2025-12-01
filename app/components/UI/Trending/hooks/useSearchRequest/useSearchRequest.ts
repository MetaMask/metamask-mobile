import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { CaipChainId } from '@metamask/utils';
import { searchTokens } from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { usePopularNetworks } from '../usePopularNetworks/usePopularNetworks';

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
 * Hook for handling search tokens request
 * @returns {Object} An object containing the search results, loading state, and a function to trigger search
 */
export const useSearchRequest = (options: {
  chainIds?: CaipChainId[];
  query: string;
  limit: number;
}) => {
  const { chainIds: providedChainIds = [], query, limit } = options;

  // Get popular networks for filtering
  const popularNetworks = usePopularNetworks();

  // Use provided chainIds or default to popular networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return popularNetworks.map(
      (network: ProcessedNetwork) => network.caipChainId,
    );
  }, [providedChainIds, popularNetworks]);

  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-fetching
  const stableChainIds = useStableArray(chainIds);

  const searchTokensRequest = useCallback(async () => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchTokens(stableChainIds, query, {
        limit,
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
  }, [stableChainIds, query, limit]);

  // Automatically trigger search when query changes
  useEffect(() => {
    searchTokensRequest();
  }, [searchTokensRequest]);

  return {
    results,
    isLoading,
    error,
    search: searchTokensRequest,
  };
};
