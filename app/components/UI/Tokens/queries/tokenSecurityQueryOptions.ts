import { queryOptions } from '@tanstack/react-query';
import type { TokenSecurityData } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';

import { tokenListSecurityBadgeKeys } from './tokenSecurityBadgeKeys';
import { requestTokenSecurityForAsset } from '../util/tokenSecurityBadgeBatch';

const STALE_TIME_MS = 12 * 60 * 60 * 1000; // 12 hours

/**
 * The one definition of the shared security entry.
 *
 * Both the hook and the prefetch build from this rather than each declaring a
 * key, a fetcher and a `staleTime`: a prefetch that disagreed on `staleTime`
 * would refetch over data the hook considers fresh, which is the exact case
 * entering Token Details from a token list hits.
 *
 * Returns the complete `TokenSecurityData`, not a badge subset. Badges read
 * only `resultType`, but the Token Details security tab reads the whole
 * payload off this same entry.
 *
 * `data` has three meaningful states: `undefined` before the first fetch
 * resolves, a payload on success, and `null` when the fetch completed with no
 * security data for the asset. The batch fails open per chunk and never
 * rejects, so a failed request also surfaces as `null` rather than `error`.
 */
export const tokenSecurityQueryOptions = (caipAssetId: CaipAssetType) =>
  queryOptions<TokenSecurityData | null, Error>({
    queryKey: tokenListSecurityBadgeKeys.byAsset(caipAssetId),
    queryFn: async () => requestTokenSecurityForAsset(caipAssetId),
    staleTime: STALE_TIME_MS,
    // Keep inactive cache entries at least as long as `staleTime` so virtualized
    // list rows that unmount are not garbage-collected while data is still fresh.
    gcTime: STALE_TIME_MS,
  });
