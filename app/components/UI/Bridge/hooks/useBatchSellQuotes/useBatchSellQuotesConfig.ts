import { useSelector } from 'react-redux';

import {
  selectBatchSellDestToken,
  selectBatchSellSlippages,
  selectBatchSellSourceTokenAmounts,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { selectBatchSellSourceWalletAddress } from '../../../../../selectors/bridge';
import { useBatchSellQuotes } from './index';

export const useBatchSellQuotesConfig = (
  options?: Pick<
    Parameters<typeof useBatchSellQuotes>[0]['config'],
    'shouldUpdateBatchSellTrades' | 'latestSourceAtomicBalances'
  >,
): Parameters<typeof useBatchSellQuotes>[0]['config'] => {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const destToken = useSelector(selectBatchSellDestToken);
  const sourceTokenAmounts = useSelector(selectBatchSellSourceTokenAmounts);
  const slippages = useSelector(selectBatchSellSlippages);
  const walletAddress = useSelector(selectBatchSellSourceWalletAddress);

  return {
    sourceTokens,
    destToken,
    sourceTokenAmounts,
    slippages,
    walletAddress,
    ...options,
  };
};
