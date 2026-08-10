import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { CaipChainId } from '@metamask/utils';
import { selectIsStellarAccountsEnabled } from '../../../../../selectors/featureFlagController/stellarAccountsEnabled';
import { NetworkToCaipChainId } from '../../../NetworkMultiSelector/NetworkMultiSelector.constants';
import { TRENDING_NETWORKS_LIST } from '../../utils/trendingNetworksList';

/**
 * Returns the chain IDs to use for trending requests.
 * Falls back to the trending networks list, excluding blocked chains when the
 * chains are not live (e.g. Stellar accounts feature is not live).
 *
 * @param providedChainIds - Explicit chain IDs to use instead of the default list.
 * @returns Chain IDs for the trending request.
 */
export const useTrendingChainIds = (
  providedChainIds: CaipChainId[] = [],
): CaipChainId[] => {
  const isStellarAccountsEnabled = useSelector(selectIsStellarAccountsEnabled);

  return useMemo((): CaipChainId[] => {
    if (providedChainIds.length > 0) {
      return providedChainIds;
    }

    const blockList = new Set([]);
    if (!isStellarAccountsEnabled) {
      blockList.add(NetworkToCaipChainId.STELLAR);
    }

    return TRENDING_NETWORKS_LIST.filter(
      (network) => !blockList.has(network.caipChainId),
    ).map((network) => network.caipChainId);
  }, [providedChainIds, isStellarAccountsEnabled]);
};
