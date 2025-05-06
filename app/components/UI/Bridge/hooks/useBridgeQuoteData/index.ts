import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectSourceToken,
  selectDestToken,
  selectSourceAmount,
  selectSlippage,
  selectBridgeQuotes,
  selectIsSubmittingTx,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import { RequestStatus } from '@metamask/bridge-controller';
import { useCallback, useMemo } from 'react';
import { fromTokenMinimalUnit } from '../../../../../util/number';
import { selectPrimaryCurrency } from '../../../../../selectors/settings';
import {
  isQuoteExpired,
  getQuoteRefreshRate,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';

import { selectTicker } from '../../../../../selectors/networkController';
import { formatAmount } from '../../../SimulationDetails/formatAmount';
import { BigNumber } from 'bignumber.js';
import I18n from '../../../../../../locales/i18n';
import useFiatFormatter from '../../../SimulationDetails/FiatDisplay/useFiatFormatter';
/**
 * Hook for getting bridge quote data without request logic
 */
export const useBridgeQuoteData = () => {
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const slippage = useSelector(selectSlippage);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const locale = I18n.locale;
  const fiatFormatter = useFiatFormatter();
  const primaryCurrency = useSelector(selectPrimaryCurrency) ?? 'ETH';
  const ticker = useSelector(selectTicker);
  const quotes = useSelector(selectBridgeQuotes);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);

  const {
    quoteFetchError,
    quotesLoadingStatus,
    quotesLastFetched,
    quotesRefreshCount,
    quoteRequest,
  } = bridgeControllerState;

  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags, sourceToken);
  const maxRefreshCount = bridgeFeatureFlags?.maxRefreshCount ?? 5; // Default to 5 refresh attempts
  const { insufficientBal } = quoteRequest;

  const willRefresh = shouldRefreshQuote(
    insufficientBal ?? false,
    quotesRefreshCount,
    maxRefreshCount,
    isSubmittingTx,
  );

  const isExpired = isQuoteExpired(willRefresh, refreshRate, quotesLastFetched);

  const bestQuote = quotes?.recommendedQuote;

  const activeQuote = isExpired && !willRefresh ? undefined : bestQuote;

  const destTokenAmount =
    activeQuote && destToken
      ? fromTokenMinimalUnit(
          activeQuote.quote.destTokenAmount,
          destToken.decimals,
        )
      : undefined;
  const formattedDestTokenAmount = destTokenAmount
    ? Number(destTokenAmount).toString()
    : undefined;

  const quoteRate =
    Number(sourceAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(sourceAmount);

  const getNetworkFee = useCallback(() => {
    if (!activeQuote?.totalNetworkFee) return '-';

    const { totalNetworkFee } = activeQuote;

    const { amount, valueInCurrency } = totalNetworkFee;

    if (!amount || !valueInCurrency) return '-';

    const formattedAmount = `${formatAmount(
      locale,
      new BigNumber(amount),
    )} ${ticker}`;
    const formattedValueInCurrency = fiatFormatter(
      new BigNumber(valueInCurrency),
    );

    return primaryCurrency === 'ETH'
      ? formattedAmount
      : formattedValueInCurrency;
  }, [activeQuote, locale, ticker, fiatFormatter, primaryCurrency]);

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
      networkFee: getNetworkFee(),
      estimatedTime: `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`,
      rate,
      priceImpact: `${priceImpactPercentage.toFixed(2)}%`,
      slippage: slippage ? `${slippage}%` : 'Auto',
    };
  }, [
    activeQuote,
    quoteRate,
    sourceToken?.symbol,
    destToken?.symbol,
    getNetworkFee,
    slippage,
  ]);

  const isLoading = quotesLoadingStatus === RequestStatus.LOADING;

  const isNoQuotesAvailable = Boolean(
    !bestQuote && quotesLastFetched && !isLoading,
  );

  return {
    bestQuote,
    quoteFetchError,
    activeQuote,
    destTokenAmount: formattedDestTokenAmount,
    isLoading: quotesLoadingStatus === RequestStatus.LOADING,
    formattedQuoteData,
    isNoQuotesAvailable,
    willRefresh,
    isExpired,
  };
};
