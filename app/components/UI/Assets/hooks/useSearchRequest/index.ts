import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import { searchTokens } from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
export const DEBOUNCE_WAIT = 500;

/**
 * Hook for handling search tokens request
 * @returns {Object} An object containing the search results, loading state, and a function to trigger search
 */
export const useSearchRequest = (options: {
  chainIds: CaipChainId[];
  query: string;
  limit: number;
}) => {
  const { chainIds, query, limit } = options;
  const [results, setResults] = useState<Awaited<
    ReturnType<typeof searchTokens>
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track the current request ID to prevent stale results from overwriting current ones
  const requestIdRef = useRef(0);

  // Stabilize the chainIds array reference to prevent unnecessary re-memoization
  const stableChainIds = useStableArray(chainIds);

  // Memoize the options object to ensure stable reference
  const memoizedOptions = useMemo(
    () => ({
      chainIds: stableChainIds,
      query,
      limit,
    }),
    [stableChainIds, query, limit],
  );

  const searchTokensRequest = useCallback(async () => {
    if (!memoizedOptions.query) {
      // Increment request ID to invalidate any pending requests
      ++requestIdRef.current;
      setResults(null);
      setIsLoading(false);
      return;
    }

    // Increment request ID to mark this as the current request
    const currentRequestId = ++requestIdRef.current;
    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await searchTokens(
        memoizedOptions.chainIds,
        memoizedOptions.query,
        {
          limit: memoizedOptions.limit,
        },
      );
      // Only update state if this is still the current request
      if (currentRequestId === requestIdRef.current) {
        setResults(searchResults || null);
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

  const debouncedSearchTokensRequest = useMemo(
    () => debounce(searchTokensRequest, DEBOUNCE_WAIT),
    [searchTokensRequest],
  );

  // Automatically trigger search when query changes
  // Cancel previous debounced function BEFORE triggering new one to prevent race conditions
  useEffect(() => {
    // Cancel any pending debounced calls from previous render
    debouncedSearchTokensRequest.cancel();

    // If query is empty, don't trigger search
    if (!memoizedOptions.query) {
      return;
    }

    // Trigger new search
    debouncedSearchTokensRequest();

    // Cleanup: cancel on unmount or when dependencies change
    return () => {
      debouncedSearchTokensRequest.cancel();
    };
  }, [debouncedSearchTokensRequest, memoizedOptions.query]);

  return {
    results: results?.data || [],
    isLoading,
    error,
    search: debouncedSearchTokensRequest,
  };
};
