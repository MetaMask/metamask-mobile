import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { debounce } from 'lodash';
import { CaipChainId, parseCaipChainId } from '@metamask/utils';
import {
  getTrendingTokens,
  SortTrendingBy,
} from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
import {
  NetworkType,
  useNetworksByNamespace,
  ProcessedNetwork,
} from '../../../../hooks/useNetworksByNamespace/useNetworksByNamespace';
import { useNetworksToUse } from '../../../../hooks/useNetworksToUse/useNetworksToUse';

export const DEBOUNCE_WAIT = 500;

/**
 * Performance Optimization: Simple cache with TTL (30 seconds)
 *
 * The key optimization that makes navigation snappy is using lazy initialization
 * in useState to check the cache synchronously during component mount. This allows:
 * 1. Immediate render with cached data (no async state updates blocking navigation)
 * 2. Avoids unnecessary API calls when navigating back and forth
 * 3. Component renders instantly if cache exists, fetch happens in background if needed
 *
 * Without this pattern, async state updates in useEffect would block navigation,
 * causing the "view all" button to require multiple clicks and feel laggy.
 */
const CACHE_DURATION_MS = 30 * 1000;
const cache = new Map<
  string,
  { data: Awaited<ReturnType<typeof getTrendingTokens>>; timestamp: number }
>();

/**
 * Compare function for CAIP chain IDs to ensure consistent sorting
 * First compares by namespace (alphabetically), then by reference
 * (numerically if both are numbers, otherwise alphabetically)
 */
const compareCaipChainIds = (a: CaipChainId, b: CaipChainId): number => {
  try {
    const { namespace: namespaceA, reference: refA } = parseCaipChainId(a);
    const { namespace: namespaceB, reference: refB } = parseCaipChainId(b);

    // First compare namespaces
    if (namespaceA !== namespaceB) {
      return namespaceA.localeCompare(namespaceB);
    }

    // Then compare references - try numeric comparison first
    const numA = Number(refA);
    const numB = Number(refB);
    if (!isNaN(numA) && !isNaN(numB)) {
      return numA - numB;
    }

    // Fallback to alphabetical comparison for non-numeric references
    return refA.localeCompare(refB);
  } catch {
    // If parsing fails, fall back to string comparison
    return a.localeCompare(b);
  }
};

// Generate cache key from options
const getCacheKey = (options: {
  chainIds: CaipChainId[];
  sortBy?: SortTrendingBy;
  minLiquidity?: number;
  minVolume24hUsd?: number;
  maxVolume24hUsd?: number;
  minMarketCap?: number;
  maxMarketCap?: number;
}): string => {
  // Sort chain IDs using compare function to ensure consistent cache keys
  // regardless of input order
  const sortedChainIds = [...options.chainIds].sort(compareCaipChainIds);
  return JSON.stringify({
    chainIds: sortedChainIds,
    sortBy: options.sortBy,
    minLiquidity: options.minLiquidity,
    minVolume24hUsd: options.minVolume24hUsd,
    maxVolume24hUsd: options.maxVolume24hUsd,
    minMarketCap: options.minMarketCap,
    maxMarketCap: options.maxMarketCap,
  });
};

// Check if cache entry is valid
const isCacheValid = (
  entry:
    | { data: Awaited<ReturnType<typeof getTrendingTokens>>; timestamp: number }
    | undefined,
): boolean => {
  if (!entry) return false;
  return Date.now() - entry.timestamp < CACHE_DURATION_MS;
};

/**
 * Simple cleanup: Remove expired entries from cache
 * Only called when storing new entries (non-blocking, doesn't affect navigation)
 */
const cleanupExpiredEntries = (): void => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= CACHE_DURATION_MS) {
      cache.delete(key);
    }
  }
};

/**
 * Clear all cache entries - useful for testing
 */
export const clearCache = (): void => {
  cache.clear();
};

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

  // Get default networks when chainIds is empty
  const { networks } = useNetworksByNamespace({
    networkType: NetworkType.Popular,
  });

  const { networksToUse } = useNetworksToUse({
    networks,
    networkType: NetworkType.Popular,
  });

  // Use provided chainIds or default to popular networks
  const chainIds = useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }
    return networksToUse.map(
      (network: ProcessedNetwork) => network.caipChainId,
    );
  }, [providedChainIds, networksToUse]);

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-memoization
  const stableChainIds = useStableArray(chainIds);

  // Memoize the options object to ensure stable reference
  const memoizedOptions = useMemo(
    () => ({
      chainIds: stableChainIds,
      sortBy,
      minLiquidity,
      minVolume24hUsd,
      maxVolume24hUsd,
      minMarketCap,
      maxMarketCap,
    }),
    [
      stableChainIds,
      sortBy,
      minLiquidity,
      minVolume24hUsd,
      maxVolume24hUsd,
      minMarketCap,
      maxMarketCap,
    ],
  );

  /**
   * Performance Optimization: Lazy initialization in useState
   *
   * This is the critical fix that makes navigation snappy. By checking the cache
   * synchronously in the useState initializer function, we can:
   * - Render immediately with cached data (no loading state delay)
   * - Avoid blocking navigation with async state updates
   * - Ensure the component is ready to render as soon as it mounts
   *
   * If we used useEffect to check cache, it would run after render, causing:
   * - Initial render with loading state
   * - Async state update that could block navigation
   * - Multiple clicks needed on "view all" button
   */
  const [results, setResults] = useState<Awaited<
    ReturnType<typeof getTrendingTokens>
  > | null>(() => {
    if (!stableChainIds.length) return null;
    const cacheKey = getCacheKey(memoizedOptions);
    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.data;
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(() => {
    if (!stableChainIds.length) return false;
    const cacheKey = getCacheKey(memoizedOptions);
    return !isCacheValid(cache.get(cacheKey));
  });

  const [error, setError] = useState<Error | null>(null);

  const fetchTrendingTokens = useCallback(async () => {
    if (!memoizedOptions.chainIds.length) {
      ++requestIdRef.current;
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Check cache first
    const cacheKey = getCacheKey(memoizedOptions);
    const cached = cache.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      setResults(cached.data);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const resultsToStore = await getTrendingTokens({
        chainIds: memoizedOptions.chainIds,
        sortBy: memoizedOptions.sortBy,
        minLiquidity: memoizedOptions.minLiquidity,
        minVolume24hUsd: memoizedOptions.minVolume24hUsd,
        maxVolume24hUsd: memoizedOptions.maxVolume24hUsd,
        minMarketCap: memoizedOptions.minMarketCap,
        maxMarketCap: memoizedOptions.maxMarketCap,
      });
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setResults(resultsToStore);
        // Store in cache and cleanup expired entries (non-blocking)
        cache.set(cacheKey, {
          data: resultsToStore,
          timestamp: Date.now(),
        });
        // Cleanup expired entries when storing new data (doesn't block navigation)
        cleanupExpiredEntries();
      }
    } catch (err) {
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setError(err as Error);
        setResults(null);
      }
    } finally {
      // Only update loading state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
  }, [memoizedOptions]);

  const debouncedFetchTrendingTokens = useMemo(
    () => debounce(fetchTrendingTokens, DEBOUNCE_WAIT),
    [fetchTrendingTokens],
  );

  // Automatically trigger fetch when options change
  // Cancel previous debounced function BEFORE triggering new one to prevent race conditions
  useEffect(() => {
    // Cancel any pending debounced calls from previous render
    debouncedFetchTrendingTokens.cancel();

    // If chainIds is empty, don't trigger fetch
    if (!stableChainIds.length) {
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Fetch new data
    debouncedFetchTrendingTokens();

    // Cleanup: cancel on unmount or when dependencies change
    return () => {
      debouncedFetchTrendingTokens.cancel();
    };
  }, [debouncedFetchTrendingTokens, stableChainIds, memoizedOptions]);

  return {
    results: results || [],
    isLoading,
    error,
    fetch: debouncedFetchTrendingTokens,
  };
};
