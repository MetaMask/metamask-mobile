import type { BigNumber as EthersBigNumber } from 'ethers';
import { useSelector } from 'react-redux';

import {
  selectDestAddress,
  selectDestToken,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { selectSourceWalletAddress } from '../../../../../selectors/bridge';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import { useBridgeQuotes } from './index';

export const useBridgeQuotesConfig = (options?: {
  latestSourceAtomicBalance?: EthersBigNumber;
}): Parameters<typeof useBridgeQuotes>[0]['config'] => {
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const srcTokenAmount = useSelector(selectSourceAmount);
  const slippage = useSelector(selectSlippage);
  const destWalletAddress = useSelector(selectDestAddress);
  const walletAddress = useSelector(selectSourceWalletAddress);
  const analyticsContext = useUnifiedSwapBridgeContext();

  return {
    sourceToken,
    destToken,
    srcTokenAmount,
    slippage: slippage === undefined ? undefined : Number(slippage),
    walletAddress,
    destWalletAddress,
    analyticsContext,
    ...(options && 'latestSourceAtomicBalance' in options
      ? { latestSourceAtomicBalance: options.latestSourceAtomicBalance }
      : {}),
  };
};
