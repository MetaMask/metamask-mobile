import { useMemo } from 'react';
import type { CaipChainId } from '@metamask/utils';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

/**
 * Returns the chain IDs to use for trending requests.
 * Falls back to the trending networks list when no explicit chain IDs are provided.
 *
 * @param providedChainIds - Explicit chain IDs to use instead of the default list.
 * @returns Chain IDs for the trending request.
 */
export const useTrendingChainIds = (
  providedChainIds: CaipChainId[] = [],
): CaipChainId[] =>
  useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }

    return TRENDING_NETWORKS_LIST.map((network) => network.caipChainId);
  }, [providedChainIds]);
