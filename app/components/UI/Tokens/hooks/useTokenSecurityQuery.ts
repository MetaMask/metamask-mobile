import { useQuery } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import { tokenListSecurityBadgeKeys } from '../queries/tokenSecurityBadgeKeys';
import { tokenSecurityQueryOptions } from '../queries/tokenSecurityQueryOptions';

interface UseTokenSecurityQueryOptions {
  enabled?: boolean;
}

/**
 * Subscribes to the shared security entry for one asset.
 *
 * Read by the token list badges, the Swaps badge, the Token Details security
 * tab and the Contract security screen, so all four agree on one verdict for a
 * token and one fetch serves them. See {@link tokenSecurityQueryOptions} for
 * what the entry holds and what its states mean.
 *
 * `enabled` exists because Token Details can mount before an asset id can be
 * resolved, where a badge always has one.
 */
export function useTokenSecurityQuery(
  caipAssetId: CaipAssetType | null | undefined,
  options?: UseTokenSecurityQueryOptions,
) {
  return useQuery({
    // Falls back to the bare root key when there is no asset id: the query is
    // disabled in that case, so the key only has to be stable and unused.
    ...(caipAssetId
      ? tokenSecurityQueryOptions(caipAssetId)
      : { queryKey: tokenListSecurityBadgeKeys.all() }),
    enabled: (options?.enabled ?? true) && Boolean(caipAssetId),
  });
}
