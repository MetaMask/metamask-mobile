import { useState, useEffect, useRef } from 'react';
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
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    setPopularTokens(undefined);

    setIsLoading(true);
    fetchTokens(abortControllerRef.current?.signal)
      .then((tokens?: PopularToken[]) => {
        setPopularTokens(tokens);
      })
      .catch((error) => {
        console.error('Error fetching popular tokens:', error);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup function: abort fetch when deps change
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [fetchTokens]);

  return { popularTokens: popularTokens ?? includeAssets, isLoading };
};
