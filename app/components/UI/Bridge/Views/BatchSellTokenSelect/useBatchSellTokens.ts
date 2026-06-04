import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { formatAddressToAssetId } from '@metamask/bridge-controller';

import { isRwaChecked } from '../../../../hooks/useTokensData/useTokensData';
import { selectBatchSellDestStablecoinsByChain } from '../../../../../core/redux/slices/bridge';
import { useTokensWithBalance } from '../../hooks/useTokensWithBalance';
import {
  BatchSellTokenSortDirection,
  buildBatchSellEligibleChains,
  removeRwaTokens,
  removeStablecoinsFromSourceTokens,
  sortBatchSellTokens,
  SUPPORTED_BATCH_SELL_CHAIN_IDS,
} from './BatchSellTokenSelect.utils';

export function useBatchSellTokens(
  tokenSortDirection: BatchSellTokenSortDirection,
) {
  const { tokens: allWalletTokens, isRwaDataLoading } = useTokensWithBalance(
    {
      chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
    },
    { shouldFetchTokenData: true },
  );
  const stablecoinsByChain = useSelector(selectBatchSellDestStablecoinsByChain);

  const eligibleSourceTokens = useMemo(() => {
    const withoutStablecoins = removeStablecoinsFromSourceTokens({
      tokens: allWalletTokens,
      stablecoinsByChain,
    });
    const withoutRwas = removeRwaTokens(withoutStablecoins);
    const confirmedNonRwas = withoutRwas.filter((token) => {
      try {
        const assetId = formatAddressToAssetId(token.address, token.chainId);
        return assetId ? isRwaChecked(assetId.toLowerCase()) : false;
      } catch {
        return false;
      }
    });
    return sortBatchSellTokens(confirmedNonRwas, tokenSortDirection);
  }, [allWalletTokens, stablecoinsByChain, tokenSortDirection]);

  const sortedEligibleChains = useMemo(
    () => buildBatchSellEligibleChains(eligibleSourceTokens),
    [eligibleSourceTokens],
  );

  return {
    eligibleSourceTokens,
    isRwaDataLoading,
    sortedEligibleChains,
  };
}
