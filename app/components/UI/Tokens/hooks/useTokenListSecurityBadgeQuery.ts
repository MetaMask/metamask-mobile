import { useQuery } from '@tanstack/react-query';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import { tokenListSecurityBadgeKeys } from '../queries/tokenSecurityBadgeKeys';
import { requestTokenSecurityForAsset } from '../util/tokenSecurityBadgeBatch';

const STALE_TIME_MS = 12 * 60 * 60 * 1000; //12 hours

/**
 * Fetches minimal security payload for list badges; results are batched via
 * {@link requestTokenSecurityForAsset}.
 */
export function useTokenListSecurityBadgeQuery(caipAssetId: CaipAssetType) {
  return useQuery<TokenSecurityData | null, Error>({
    queryKey: tokenListSecurityBadgeKeys.byAsset(caipAssetId),
    queryFn: async () => requestTokenSecurityForAsset(caipAssetId),
    staleTime: STALE_TIME_MS,
    // Keep inactive cache entries at least as long as `staleTime` so virtualized
    // list rows that unmount are not garbage-collected while data is still fresh.
    cacheTime: STALE_TIME_MS,
  });
}
