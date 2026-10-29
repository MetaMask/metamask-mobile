import type { QueryClient } from '@tanstack/react-query';
import type { CaipAssetType } from '@metamask/utils';

import { tokenSecurityQueryOptions } from './tokenSecurityQueryOptions';

/**
 * Warms the shared security entry for one asset.
 *
 * Entering Token Details from a token list needs no warming, because the row's
 * badge has already populated this entry. Deep links and search have no list
 * behind them, so without this the security tab starts cold.
 *
 * A no-op when a fresh entry already exists, so calling it on every Token
 * Details mount costs nothing on the warm path.
 */
export const prefetchTokenSecurity = (
  queryClient: QueryClient,
  caipAssetId: CaipAssetType | null,
): void => {
  if (!caipAssetId) {
    return;
  }

  queryClient
    .query(tokenSecurityQueryOptions(caipAssetId))
    .catch(() => undefined);
};
