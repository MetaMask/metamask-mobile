import { useCallback, useMemo, useEffect, useState } from 'react';
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
      setResults(null);
      setIsLoading(false);
      return;
    }

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
      setResults(searchResults || null);
    } catch (err) {
      setError(err as Error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  }, [memoizedOptions]);

  const debouncedSearchTokensRequest = useMemo(
    () => debounce(searchTokensRequest, DEBOUNCE_WAIT),
    [searchTokensRequest],
  );

  // Automatically trigger search when query changes
  useEffect(() => {
    debouncedSearchTokensRequest();
  }, [debouncedSearchTokensRequest]);

  // Cleanup debounced function on unmount or when dependencies change
  useEffect(
    () => () => {
      debouncedSearchTokensRequest.cancel();
    },
    [debouncedSearchTokensRequest],
  );

  return {
    results: results?.data || [],
    isLoading,
    error,
    search: debouncedSearchTokensRequest,
  };
};
