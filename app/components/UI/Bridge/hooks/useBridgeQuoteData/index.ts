import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectSourceToken,
  selectDestToken,
  selectSourceAmount,
  selectSlippage,
} from '../../../../../core/redux/slices/bridge';
import {
  BridgeFeatureFlagsKey,
  RequestStatus,
} from '@metamask/bridge-controller';
import { useMemo } from 'react';
import { fromTokenMinimalUnit } from '../../../../../util/number';

import {
  isQuoteExpired,
  getQuoteRefreshRate,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';

/**
 * Hook for getting bridge quote data without request logic
 */
export const useBridgeQuoteData = () => {
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const slippage = useSelector(selectSlippage);

  const {
    quoteFetchError,
    quotesLoadingStatus,
    quotesLastFetched,
    quotes,
    quotesRefreshCount,
    bridgeFeatureFlags,
    quoteRequest,
  } = bridgeControllerState;

  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags, sourceToken);

  const mobileConfig =
    bridgeFeatureFlags?.[BridgeFeatureFlagsKey.MOBILE_CONFIG];
  const maxRefreshCount = mobileConfig?.maxRefreshCount ?? 5; // Default to 5 refresh attempts
  const { insufficientBal } = quoteRequest;

  const willRefresh = shouldRefreshQuote(
    insufficientBal ?? false,
    quotesRefreshCount,
    maxRefreshCount,
  );

  const isExpired = isQuoteExpired(willRefresh, refreshRate, quotesLastFetched);

  const bestQuote = quotes?.[0];

  const activeQuote = isExpired && !willRefresh ? undefined : bestQuote;

  const destTokenAmount =
    activeQuote && destToken
      ? fromTokenMinimalUnit(
          activeQuote.quote.destTokenAmount,
          destToken.decimals,
        )
      : undefined;
  const formattedDestTokenAmount = destTokenAmount
    ? Number(destTokenAmount).toFixed(2)
    : undefined;

  const quoteRate =
    Number(sourceAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(sourceAmount);

  const formattedQuoteData = useMemo(() => {
    if (!activeQuote) return undefined;

    const { quote, estimatedProcessingTimeInSeconds } = activeQuote;

    //@ts-expect-error - priceImpact is not typed
    const priceImpact = quote.bridgePriceData.priceImpact;
    const priceImpactPercentage = Number(priceImpact) * 100;

    const rate = quoteRate
      ? `1 ${sourceToken?.symbol} = ${quoteRate.toFixed(1)} ${
          destToken?.symbol
        }`
      : '--';

    return {
      networkFee: '44', // TODO: Needs quote metadata in bridge controller
      estimatedTime: `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`,
      rate,
      priceImpact: `${priceImpactPercentage.toFixed(2)}%`, //TODO: Need to calculate this
      slippage: `${slippage}%`,
    };
  }, [activeQuote, sourceToken, destToken, quoteRate, slippage]);

  return {
    bestQuote,
    quoteFetchError,
    activeQuote,
    destTokenAmount: formattedDestTokenAmount,
    isLoading: quotesLoadingStatus === RequestStatus.LOADING,
    formattedQuoteData,
  };
};
