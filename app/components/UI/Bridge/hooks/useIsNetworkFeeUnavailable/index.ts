import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { isBitcoinChainId } from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '../useBridgeQuoteData';

type ActiveQuote = ReturnType<typeof useBridgeQuoteData>['activeQuote'];

export const isQuoteNetworkFeeUnavailable = (
  activeQuote: ActiveQuote,
): boolean => {
  const sourceChainId = activeQuote?.quote?.srcChainId;

  if (!sourceChainId || !isBitcoinChainId(sourceChainId)) {
    return false;
  }

  const networkFeeAmount = activeQuote.totalNetworkFee?.amount;
  const networkFee =
    networkFeeAmount == null ? undefined : new BigNumber(networkFeeAmount);

  return (
    networkFeeAmount == null || !networkFee?.isFinite() || networkFee.lte(0)
  );
};

export const useIsNetworkFeeUnavailable = (activeQuote: ActiveQuote): boolean =>
  useMemo(() => isQuoteNetworkFeeUnavailable(activeQuote), [activeQuote]);
