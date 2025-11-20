import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../../../reducers';
import { setCacheData } from '../../../../core/redux/slices/card';

/**
 * Configuration options for the cache hook
 */
interface CacheConfig {
  /** Cache duration in milliseconds (default: 5 minutes) */
  cacheDuration?: number;
  /** Whether to fetch data on component mount (default: true) */
  fetchOnMount?: boolean;
}

/**
 * Return type for the cache hook
 */
interface CacheHookReturn<T> {
  /** Cached data or null if not available */
  data: T | null;
  /** Loading state - true when actively fetching */
  isLoading: boolean;
  /** Error object if last fetch failed, null otherwise */
  error: Error | null;
  /** Function to manually trigger data fetch */
  fetchData: () => Promise<T | null>;
}

/**
 * A simplified hook that provides caching functionality using Redux for state management.
 *
 * This hook implements a simple cache strategy:
 * 1. Check if cache is valid (less than 5 minutes old by default)
 * 2. If cache is valid and data exists, return cached data
 * 3. If cache is stale or no data exists, fetch new data
 * 4. Store both data and lastFetched timestamp in Redux
 *
 * @template T The type of data being cached
 * @param cacheKey Unique identifier for this cache entry
 * @param fetchFn Async function that fetches the data
 * @param config Optional configuration for cache behavior
 * @returns Object containing data, loading state, error, and fetch function
 *
 * @example
 * ```typescript
 * const { data, isLoading, error, fetchData } = useWrapWithCache(
 *   'registration-settings',
 *   () => api.getRegistrationSettings(),
 *   { cacheDuration: 10 * 60 * 1000 }, // 10 minutes
 * );
 * ```
 */
export const useWrapWithCache = <T>(
  cacheKey: string,
  fetchFn: () => Promise<T | null>,
  config: CacheConfig = {},
): CacheHookReturn<T> => {
  const {
    cacheDuration = 5 * 60 * 1000, // 5 minutes default
    fetchOnMount = true,
  } = config;

  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Get cached data and timestamp from Redux store (card.cache)
  const cachedData = useSelector(
    (state: RootState) => (state.card.cache.data[cacheKey] as T | null) || null,
  );
  const lastFetched = useSelector(
    (state: RootState) => state.card.cache.timestamps[cacheKey] || null,
  );

  // Helper to check if cache is still valid (same pattern as useGetPriorityCardToken)
  const isCacheValid = useCallback(() => {
    if (!lastFetched) return false;
    const now = new Date();
    const cacheExpiry = new Date(now.getTime() - cacheDuration);
    // Handle timestamp as number (from card.cache.timestamps)
    const lastFetchedDate = new Date(lastFetched);
    return lastFetchedDate > cacheExpiry;
  }, [lastFetched, cacheDuration]);

  const cacheIsValid = isCacheValid();

  // Fetch function that updates cache
  const fetchData: () => Promise<T | null> = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      const normalizedResult = result ?? null;

      // Only update cache if we got actual data (not null from missing dependencies)
      // This prevents caching "null" responses when dependencies aren't ready
      if (normalizedResult !== null) {
        dispatch(
          setCacheData({
            key: cacheKey,
            data: normalizedResult,
            timestamp: Date.now(),
          }),
        );
      }

      return normalizedResult;
    } catch (err) {
      const errorObject = err instanceof Error ? err : new Error(String(err));
      setError(errorObject);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, cacheKey, dispatch]);

  // Effect to handle initial fetch - runs on mount and when cache becomes invalid
  // We DON'T include fetchData in dependencies to prevent refetching when the fetch function changes
  // (e.g., when delegationSettings loads, it shouldn't trigger a refetch if cache is still valid)
  useEffect(() => {
    if (!fetchOnMount) {
      return;
    }

    // Don't fetch if already loading (prevents infinite loops on re-renders)
    if (isLoading) {
      return;
    }

    // Don't fetch if there was an error (prevents retry loops on failed requests)
    // User must manually call fetchData() to retry
    if (error) {
      return;
    }

    // If cache is valid and we have data, don't fetch
    if (cacheIsValid && cachedData !== null) {
      return;
    }

    // Cache is stale or we don't have data, fetch new data
    fetchData();
    // We deliberately exclude fetchData from dependencies to prevent unnecessary refetches
    // when the fetch function reference changes but the cache is still valid
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheIsValid, cachedData, fetchOnMount, isLoading, error]);

  // Determine loading state: only show loading if actively fetching AND no cached data
  const shouldShowLoading = isLoading && (!cachedData || !cacheIsValid);

  return {
    data: cachedData,
    isLoading: shouldShowLoading,
    error,
    fetchData,
  };
};
