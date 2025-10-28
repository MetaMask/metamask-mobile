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
  /** Error state - true if last fetch failed */
  error: boolean;
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
  const [error, setError] = useState<boolean>(false);

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
    setError(false);

    try {
      const result = await fetchFn();

      // Only update cache if we got actual data (not null from missing dependencies)
      // This prevents caching "null" responses when dependencies aren't ready
      if (result !== null) {
        dispatch(
          setCacheData({
            key: cacheKey,
            data: result,
            timestamp: Date.now(),
          }),
        );
      }

      return result;
    } catch (err) {
      setError(true);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, cacheKey, dispatch]);

  // Effect to handle initial fetch - runs on mount and when cache becomes invalid
  // Also re-runs when fetchFn changes (e.g., when underlying dependencies like delegationSettings load)
  useEffect(() => {
    if (!fetchOnMount) {
      return;
    }

    // If cache is valid and we have data, don't fetch
    if (cacheIsValid && cachedData !== null) {
      return;
    }

    // Cache is stale or we don't have data, fetch new data
    fetchData();
    // We deliberately include fetchData to allow refetching when cache expires
    // or when the underlying fetch function changes (e.g., dependencies load)
    // eslint-disable-next-line react-compiler/react-compiler
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheIsValid, cachedData, fetchOnMount, fetchData]);

  // Determine loading state: only show loading if actively fetching AND no cached data
  const shouldShowLoading = isLoading && (!cachedData || !cacheIsValid);

  return {
    data: cachedData,
    isLoading: shouldShowLoading,
    error,
    fetchData,
  };
};
