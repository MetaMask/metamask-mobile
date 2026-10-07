import { useQuery } from '@tanstack/react-query';
import {
  resolveTokenAssetDetails,
  tokenAssetQueryOptions,
  type TokenAssetRecord,
} from './tokenAssetQuery';

export interface UseTokenAssetDetailsResult {
  asset: TokenAssetRecord | null;
  isLoading: boolean;
  isError: boolean;
}

export const useTokenAssetDetails = (
  assetId: string | null,
): UseTokenAssetDetailsResult => {
  const query = useQuery({
    ...tokenAssetQueryOptions(assetId ?? ''),
    enabled: Boolean(assetId),
  });

  return {
    asset: resolveTokenAssetDetails(assetId, query.data, query.isError),
    isLoading: Boolean(assetId) && query.isPending,
    isError: query.isError,
  };
};
