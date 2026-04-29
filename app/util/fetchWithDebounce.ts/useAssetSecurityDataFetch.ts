import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import { createBatchFetchWithDebounce } from './fetchWithDebounce';

// ─── Batch fetcher singleton ─────────────────────────────────────────────────

interface TokenSecurityData {
  securityData: string;
}

const DEFAULT_BATCH_SIZE = 20;
const DEFAULT_MAX_WAIT_MS = 50;

const fetchAssetSecurityData = createBatchFetchWithDebounce({
  batchSize: DEFAULT_BATCH_SIZE,
  maxWaitMs: DEFAULT_MAX_WAIT_MS,
  fetchFn: async (
    assetIds: { id: CaipAssetType }[],
  ): Promise<Record<CaipAssetType, TokenSecurityData>> => {
    // TODO: Implement actual fetch
    const assets = assetIds.map(({ id }) => ({ id, securityData: 'test' }));

    return assets.reduce(
      (acc, asset) => {
        acc[asset.id] = { securityData: asset.securityData };
        return acc;
      },
      {} as Record<CaipAssetType, TokenSecurityData>,
    );
  },
});

// ─── Hook ────────────────────────────────────────────────────────────────────

const STALE_TIME_MS = 1000 * 60 * 60; // 60 minutes

/**
 * Fetches security data for a single token asset.
 *
 * Internally delegates to a shared batching fetcher so that multiple hook
 * instances rendering in the same tick are coalesced into a single API call.
 * Results are cached per asset ID via the query key `['assetSecurityData', assetId]`.
 *
 * @param assetId - CAIP-19 asset identifier.
 */
export const useAssetSecurityDataFetch = (
  assetId: CaipAssetType,
): UseQueryResult<TokenSecurityData, Error> =>
  useQuery<TokenSecurityData, Error>({
    queryKey: ['assetSecurityData', assetId],
    queryFn: () => fetchAssetSecurityData({ id: assetId }),
    staleTime: STALE_TIME_MS,
  });
