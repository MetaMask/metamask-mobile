import { useState, useEffect } from 'react';
import { CaipChainId, CaipAssetType } from '@metamask/utils';

export interface PopularToken {
  assetId: CaipAssetType;
  chainId: CaipChainId;
  decimals: number;
  image: string;
  name: string;
  symbol: string;
  noFee?: {
    isSource: boolean;
    isDestination: boolean;
  };
}

interface UsePopularTokensParams {
  chainIds: CaipChainId[];
  excludeAssetIds: string; // Stringified array to prevent unnecessary re-renders
}

interface UsePopularTokensResult {
  popularTokens: PopularToken[];
  isLoading: boolean;
}

/**
 * Custom hook to fetch popular tokens from the Bridge API
 * @param params - Configuration object containing chainIds and excludeAssetIds
 * @returns Object containing popularTokens array and isLoading state
 */
export const usePopularTokens = ({
  chainIds,
  excludeAssetIds,
}: UsePopularTokensParams): UsePopularTokensResult => {
  const [popularTokens, setPopularTokens] = useState<PopularToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPopularTokens = async () => {
      setIsLoading(true);

      try {
        const parsedExcludeAssetIds: CaipAssetType[] =
          JSON.parse(excludeAssetIds);

        const response = await fetch(
          'https://bridge.dev-api.cx.metamask.io/getTokens/popular',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chainIds,
              excludeAssetIds: parsedExcludeAssetIds,
            }),
          },
        );
        const popularAssets: PopularToken[] = await response.json();

        setPopularTokens(popularAssets);
      } catch (error) {
        console.error('Error fetching popular tokens:', error);
        setPopularTokens([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPopularTokens();
  }, [chainIds, excludeAssetIds]);

  return { popularTokens, isLoading };
};
