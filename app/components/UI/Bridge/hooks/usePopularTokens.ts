import { useState, useEffect, useMemo } from 'react';
import type { IncludeAsset, PopularToken } from '../types';

interface UsePopularTokensParams {
  includeAssets: IncludeAsset[];
  fetchTokens: (signal?: AbortSignal) => Promise<PopularToken[] | undefined>;
}

interface UsePopularTokensResult {
  popularTokens: (PopularToken | IncludeAsset)[];
  isLoading: boolean;
}

/**
 * Custom hook to fetch popular tokens from the Bridge API with caching
 * @param params - Configuration object containing chainIds and includeAssets
 * @returns Object containing popularTokens array and isLoading state
 */
export const usePopularTokens = ({
  includeAssets,
  fetchTokens,
}: UsePopularTokensParams): UsePopularTokensResult => {
  const [popularTokens, setPopularTokens] = useState<
    PopularToken[] | undefined
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const abortController = new AbortController();

    setPopularTokens(undefined);

    setIsLoading(true);
    fetchTokens(abortController.signal)
      .then((tokens?: PopularToken[]) => {
        setPopularTokens(tokens);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup function: abort fetch and mark as cancelled when deps change
    return () => {
      abortController.abort();
    };
  }, [fetchTokens, includeAssets]);

  return { popularTokens: popularTokens ?? includeAssets, isLoading };
};
