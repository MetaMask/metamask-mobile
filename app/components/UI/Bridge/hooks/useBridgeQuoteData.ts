import { useSelector } from 'react-redux';
import {
  selectBridgeQuoteError,
  selectBridgeQuoteLoading,
  selectDestToken,
  selectSlippage,
  selectSourceAmount,
  selectSourceToken,
  selectBridgeQuote,
} from '../../../../core/redux/slices/bridge';
import { RequestStatus } from '@metamask/bridge-controller';
import { useMemo } from 'react';

/**
 * Hook for getting bridge quote data without request logic
 */
export const useBridgeQuoteData = () => {
  const bridgeQuote = useSelector(selectBridgeQuote);
  const quoteError = useSelector(selectBridgeQuoteError);
  const quoteLoading = useSelector(selectBridgeQuoteLoading);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const slippage = useSelector(selectSlippage);
  const sourceAmount = useSelector(selectSourceAmount);

  const formattedQuoteData = useMemo(() => {
    if (!bridgeQuote) return undefined;

    const { quote, estimatedProcessingTimeInSeconds } = bridgeQuote;
    return {
      networkFee: '44', // TODO: Calculate from quote data
      estimatedTime: `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`,
      rate: `1 ${sourceToken?.symbol} = ${(
        Number(quote.destTokenAmount) / Number(quote.srcTokenAmount)
      ).toFixed(1)} ${destToken?.symbol}`,
      priceImpact: '-0.06%', // TODO: Calculate from quote data
      slippage: `${slippage}%`,
    };
  }, [bridgeQuote, sourceToken?.symbol, destToken?.symbol, slippage]);

  return {
    sourceToken,
    destToken,
    quoteError,
    sourceAmount,
    slippage,
    isLoading: quoteLoading === RequestStatus.LOADING,
    hasQuote: quoteLoading === RequestStatus.FETCHED && !!bridgeQuote,
    formattedQuoteData,
    bridgeQuote,
  };
};
