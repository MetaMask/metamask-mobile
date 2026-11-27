import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tokenSecurityQueryOptions } from '../../Tokens/queries/tokenSecurityQueryOptions';
import { tokenListSecurityBadgeKeys } from '../../Tokens/queries/tokenSecurityBadgeKeys';
import type { CaipAssetType } from '@metamask/utils';
import {
  fetchTokenAssets,
  TokenSecurityData,
} from '@metamask/assets-controllers';

interface UseTokenSecurityDataOpts {
  /** CAIP-19 asset ID. When null, no fetch is attempted. */
  assetId: CaipAssetType | null;
  /** Pre-fetched security data from trending/search — returned immediately if provided. */
  prefetchedData?: TokenSecurityData;
}

interface UseTokenSecurityDataResult {
  securityData: TokenSecurityData | null;
  isLoading: boolean;
  error: Error | null;
  fetchedAt?: number;
}

const isValidTokenSecurityData = (data: unknown): data is TokenSecurityData =>
  data != null &&
  typeof data === 'object' &&
  typeof (data as TokenSecurityData).resultType === 'string' &&
  Array.isArray((data as TokenSecurityData).features);

export const useTokenSecurityData = ({
  assetId,
  prefetchedData,
}: UseTokenSecurityDataOpts): UseTokenSecurityDataResult => {
  const client = useQueryClient();
  const initialData = isValidTokenSecurityData(prefetchedData)
    ? prefetchedData
    : undefined;
  const query = useQuery({
    ...(assetId
      ? tokenSecurityQueryOptions(assetId)
      : { queryKey: tokenListSecurityBadgeKeys.all() }),
    enabled: Boolean(assetId) && !initialData,
    initialData: assetId ? initialData : undefined,
    retry: false,
    queryFn: async () => {
      if (!assetId) return null;
      const assets = await fetchTokenAssets([assetId], {
        includeTokenSecurityData: true,
      });
      return assets?.[0]?.securityData ?? null;
    },
  });

  useEffect(() => {
    if (assetId && initialData && query.data == null) {
      client.setQueryData<TokenSecurityData | null>(
        tokenListSecurityBadgeKeys.byAsset(assetId),
        (cached) => cached ?? initialData,
      );
    }
  }, [assetId, client, initialData, query.data]);

  return {
    securityData: query.data ?? initialData ?? null,
    isLoading: !initialData && query.isLoading,
    error: initialData ? null : query.error,
    fetchedAt: query.dataUpdatedAt || undefined,
  };
};
