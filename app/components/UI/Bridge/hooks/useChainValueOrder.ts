import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectAssetsBySelectedAccountGroup } from '../../../../selectors/assets/assets-list';
import { selectChainValueOrderOverride } from '../../../../selectors/featureFlagController/swapsChainValueOrderOverride';
import {
  getChainValueOrder,
  ChainRankingEntry,
} from '../utils/getChainValueOrder';

/**
 * Returns allowed chains ordered by selected-account-group fiat holdings and
 * remote position overrides.
 *
 * This hook must only be mounted for the treatment variant so control does not
 * subscribe to asset holdings or chain override state.
 *
 * @param chainRanking - Allowed chains in LaunchDarkly ranking order.
 * @returns Chains ordered for the treatment experience.
 */
export function useChainValueOrder(
  chainRanking: readonly ChainRankingEntry[],
): ChainRankingEntry[] {
  const assetsByChain = useSelector(selectAssetsBySelectedAccountGroup);
  const promotedChains = useSelector(selectChainValueOrderOverride);

  return useMemo(
    () => getChainValueOrder(chainRanking, assetsByChain, promotedChains),
    [assetsByChain, chainRanking, promotedChains],
  );
}
