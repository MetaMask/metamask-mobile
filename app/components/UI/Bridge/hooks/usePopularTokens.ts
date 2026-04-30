import { useState, useEffect, useMemo } from 'react';
import { type CaipAssetType } from '@metamask/utils';

export enum SecurityDataType {
  Info = 'Info',
  Benign = 'Benign',
  Verified = 'Verified',
  Warning = 'Warning',
  Spam = 'Spam',
  Malicious = 'Malicious',
}

export interface SecurityFeature {
  featureId: string;
  type: SecurityDataType;
  description: string;
}

export interface SecurityData {
  type: SecurityDataType;
  metadata?: { features: SecurityFeature[] };
}

export interface PopularToken {
  assetId: CaipAssetType;
  decimals: number;
  iconUrl: string;
  name: string;
  symbol: string;
  isVerified?: boolean;
  noFee?: {
    isSource: boolean;
    isDestination: boolean;
  };
  securityData?: SecurityData;
}

interface UsePopularTokensParams {
  includeAssets: string; // Stringified array to prevent unnecessary re-renders
  fetchTokens: () => Promise<PopularToken[]>;
}

interface UsePopularTokensResult {
  popularTokens: PopularToken[];
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
  const [popularTokens, setPopularTokens] = useState<PopularToken[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const parsedIncludeAssets = useMemo(() => {
    try {
      return JSON.parse(includeAssets);
    } catch (error) {
      console.error('Error parsing include assets:', error);
      return [];
    }
  }, [includeAssets]);

  useEffect(() => {
    const abortController = new AbortController();

    setPopularTokens(parsedIncludeAssets);

    setIsLoading(true);
    fetchTokens()
      .then((tokens: PopularToken[]) => {
        setPopularTokens(tokens);
      })
      .catch((error) => {
        console.error('Error fetching popular tokens:', error);
        setPopularTokens(parsedIncludeAssets);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Cleanup function: abort fetch and mark as cancelled when deps change
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchTokens, JSON.stringify(parsedIncludeAssets)]);

  return { popularTokens, isLoading };
};
