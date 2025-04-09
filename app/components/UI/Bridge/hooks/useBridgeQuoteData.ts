import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectSourceToken,
  selectDestToken,
  selectSourceAmount,
  selectSlippage,
} from '../../../../core/redux/slices/bridge';
import {
  RequestStatus,
  BridgeFeatureFlagsKey,
  BRIDGE_QUOTE_MAX_RETURN_DIFFERENCE_PERCENTAGE,
} from '@metamask/bridge-controller';
import { useMemo } from 'react';
import {
  getQuoteRefreshRate,
  shouldRefreshQuote,
  isQuoteExpired,
} from '../utils/quoteUtils';
import { fromTokenMinimalUnit } from '../../../../util/number';

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

  const destAmount = activeQuote?.quote.destTokenAmount;

  const destTokenAmount =
    destAmount && destToken
      ? fromTokenMinimalUnit(destAmount, destToken.decimals)
      : null;
  const formattedDestTokenAmount = destTokenAmount
    ? Number(destTokenAmount).toFixed(1)
    : null;

  const quoteRate = Number(destTokenAmount) / Number(sourceAmount);

  const formattedQuoteData = useMemo(() => {
    if (!activeQuote) return undefined;

    const { estimatedProcessingTimeInSeconds } = activeQuote;
    return {
      networkFee: '44', // TODO: Calculate from quote data
      estimatedTime: `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`,
      rate: `1 ${sourceToken?.symbol} = ${quoteRate.toFixed(1)} ${
        destToken?.symbol
      }`,
      priceImpact: `${BRIDGE_QUOTE_MAX_RETURN_DIFFERENCE_PERCENTAGE}%`, //TODO: Need to calculate this
      slippage: `${slippage}%`,
    };
  }, [
    activeQuote,
    sourceToken?.symbol,
    quoteRate,
    destToken?.symbol,
    slippage,
  ]);

  return {
    sourceToken,
    destToken,
    quoteFetchError,
    activeQuote,
    sourceAmount,
    destTokenAmount: formattedDestTokenAmount,
    slippage,
    isLoading: quotesLoadingStatus === RequestStatus.LOADING,
    formattedQuoteData,
  };
};
