import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import type { CaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import type { ProcessedNetwork } from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { usePopularNetworks } from '../usePopularNetworks/usePopularNetworks';

/**
 * Hook for handling trending tokens request
 * @returns {Object} An object containing the trending tokens results, loading state, error, and a function to trigger fetch
 */
export const useTrendingRequest = (options: {
  chainIds?: CaipChainId[];
  sortBy?: SortTrendingBy;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  maxVolume24hUsd?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
}) => {
  const {
    chainIds: providedChainIds = [],
    sortBy,
    minLiquidity = 0,
    minVolume24hUsd = 0,
    maxVolume24hUsd,
    minMarketCap = 0,
    maxMarketCap,
  } = options;

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

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-fetching
  const stableChainIds = useStableArray(chainIds);

  const [results, setResults] = useState<
    Awaited<ReturnType<typeof getTrendingTokens>>
  >([]);

  const [isLoading, setIsLoading] = useState(false);

  const [error, setError] = useState<Error | null>(null);

  const fetchTrendingTokens = useCallback(async () => {
    if (!stableChainIds.length) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const resultsToStore = await getTrendingTokens({
        chainIds: stableChainIds,
        sortBy,
        minLiquidity,
        minVolume24hUsd,
        maxVolume24hUsd,
        minMarketCap,
        maxMarketCap,
      });
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setResults(resultsToStore);
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
  }, [
    stableChainIds,
    sortBy,
    minLiquidity,
    minVolume24hUsd,
    maxVolume24hUsd,
    minMarketCap,
    maxMarketCap,
  ]);

  // Automatically trigger fetch when options change
  useEffect(() => {
    fetchTrendingTokens();
  }, [fetchTrendingTokens]);

  return {
    results,
    isLoading,
    error,
    fetch: fetchTrendingTokens,
  };
};
