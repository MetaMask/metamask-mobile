import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { selectBatchSellDestStablecoinsByChain } from '../../../../../core/redux/slices/bridge';
import { useTokensWithBalance } from '../../hooks/useTokensWithBalance';
import {
  removeStablecoinsFromSourceTokens,
  SUPPORTED_BATCH_SELL_CHAIN_IDS,
} from './BatchSellTokenSelect.utils';

export function useBatchSellTokens() {
  const allWalletTokens = useTokensWithBalance({
    chainIds: SUPPORTED_BATCH_SELL_CHAIN_IDS,
  });
  const stablecoinsByChain = useSelector(selectBatchSellDestStablecoinsByChain);

  return useMemo(
    () =>
      removeStablecoinsFromSourceTokens({
        tokens: allWalletTokens,
        stablecoinsByChain,
      }),
    [allWalletTokens, stablecoinsByChain],
  );
}
