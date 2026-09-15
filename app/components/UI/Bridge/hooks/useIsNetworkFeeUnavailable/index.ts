import { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import {
  isBitcoinChainId,
  sumAmounts,
  isStellarChainId,
  isTronChainId,
} from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '../useBridgeQuoteData';

type ActiveQuote = ReturnType<typeof useBridgeQuoteData>['activeQuote'];

export const isQuoteNetworkFeeUnavailable = (
  activeQuote: ActiveQuote,
): boolean => {
  const sourceChainId = activeQuote?.chainId;

  if (
    !sourceChainId ||
    (!isBitcoinChainId(sourceChainId) &&
      !isTronChainId(sourceChainId) &&
      !isStellarChainId(sourceChainId))
  ) {
    return false;
  }

  const networkFeeAmount = sumAmounts(
    activeQuote.quote.feeData?.network,
    activeQuote.quote.feeData?.relayer,
  )?.normalizedAmount;
  const networkFee =
    networkFeeAmount === undefined
      ? undefined
      : new BigNumber(networkFeeAmount);

  return (
    networkFeeAmount === undefined ||
    !networkFee?.isFinite() ||
    networkFee.lte(0)
  );
};

export const useIsNetworkFeeUnavailable = (activeQuote: ActiveQuote): boolean =>
  useMemo(() => isQuoteNetworkFeeUnavailable(activeQuote), [activeQuote]);
