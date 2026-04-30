import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';
import { createBatchFetchWithDebounce } from './fetchWithDebounce';

interface AssetSecurityData {
  result_type: string;
}

// ─── Batch fetcher singleton ─────────────────────────────────────────────────

const SECURITY_API_BASE =
  'https://security-alerts.api.cx.metamask.io/token/v1/scan-bulk';
const DEFAULT_BATCH_SIZE = 100;
const DEFAULT_MAX_WAIT_MS = 50;

const fetchAssetSecurityData = createBatchFetchWithDebounce({
  batchSize: DEFAULT_BATCH_SIZE,
  maxWaitMs: DEFAULT_MAX_WAIT_MS,
  fetchFn: async (
    assetIds: { id: CaipAssetType }[],
  ): Promise<Record<CaipAssetType, AssetSecurityData>> => {
    const ids = assetIds.map(({ id }) => id);
    const url = `${SECURITY_API_BASE}?assetIds=${ids.join(',')}`;

    console.log('DEBUG XXX FETCHING ASSETS SECURITY DATA', {
      ids,
      url,
    });

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(
        `Token security fetch failed: ${response.status} ${response.statusText}`,
      );
    }

    const assets = (await response.json()) as {
      results: Record<CaipAssetType, AssetSecurityData>;
    };

    console.log('DEBUG XXX FETCHED ASSETS SECURITY DATA', {
      ids,
      assets: assets.results,
    });

    return assets.results;
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
): UseQueryResult<AssetSecurityData, Error> =>
  useQuery<AssetSecurityData, Error>({
    queryKey: ['assetSecurityData', assetId],
    queryFn: () => fetchAssetSecurityData({ id: assetId }),
    staleTime: STALE_TIME_MS,
  });
