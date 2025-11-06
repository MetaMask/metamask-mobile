import { useCallback, useMemo, useEffect } from 'react';
import { debounce } from 'lodash';
import { CaipChainId } from '@metamask/utils';
import { searchTokens } from '@metamask/assets-controllers';
import { useStableArray } from '../../../Perps/hooks/useStableArray';
export const DEBOUNCE_WAIT = 500;

/**
 * Hook for handling search tokens request
 * @returns {Function} A debounced function to search tokens
 */
export const useSearchRequest = (options: {
  chainIds: CaipChainId[];
  query: string;
  limit: number;
}) => {
  const { chainIds, query, limit } = options;

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
      return;
    }

    await searchTokens(memoizedOptions.chainIds, memoizedOptions.query, {
      limit: memoizedOptions.limit,
    });
  }, [memoizedOptions]);

  const debouncedSearchTokensRequest = useMemo(
    () => debounce(searchTokensRequest, DEBOUNCE_WAIT),
    [searchTokensRequest],
  );

  // Cleanup debounced function on unmount or when dependencies change
  useEffect(
    () => () => {
      debouncedSearchTokensRequest.cancel();
    },
    [debouncedSearchTokensRequest],
  );

  return debouncedSearchTokensRequest;
};
