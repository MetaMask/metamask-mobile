import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { isBitcoinChainId, sumAmounts } from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '../useBridgeQuoteData';

type ActiveQuote = ReturnType<typeof useBridgeQuoteData>['activeQuote'];

export const isQuoteNetworkFeeUnavailable = (
  activeQuote: ActiveQuote,
): boolean => {
  const sourceChainId = activeQuote?.chainId;

  if (!sourceChainId || !isBitcoinChainId(sourceChainId)) {
    return false;
  }

  const networkFeeAmount = sumAmounts(
    activeQuote.quote.feeData?.network,
  )?.normalizedAmount;
  const networkFee =
    networkFeeAmount == null ? undefined : new BigNumber(networkFeeAmount);

  return (
    networkFeeAmount == null || !networkFee?.isFinite() || networkFee.lte(0)
  );
};
export const useIsNetworkFeeUnavailable = (activeQuote: ActiveQuote): boolean =>
  useMemo(() => isQuoteNetworkFeeUnavailable(activeQuote), [activeQuote]);
