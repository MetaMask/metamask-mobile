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
  selectIsSolanaToEvm,
  selectIsSolanaSwap,
} from '../../../../../core/redux/slices/bridge';
import { RequestStatus } from '@metamask/bridge-controller';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import {
  fromTokenMinimalUnit,
  isNumberValue,
} from '../../../../../util/number';
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
import useIsInsufficientBalance from '../useInsufficientBalance';
import { BigNumber as EthersBigNumber } from 'ethers';
import useValidateBridgeTx from '../../../../../util/bridge/hooks/useValidateBridgeTx';
import { getIntlNumberFormatter } from '../../../../../util/intl';

interface UseBridgeQuoteDataParams {
  latestSourceAtomicBalance?: EthersBigNumber;
}

/**
 * Hook for getting bridge quote data without request logic
 */
export const useBridgeQuoteData = ({
  latestSourceAtomicBalance,
}: UseBridgeQuoteDataParams = {}) => {
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
  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isSolanaToEvm = useSelector(selectIsSolanaToEvm);
  const { validateBridgeTx } = useValidateBridgeTx();

  const [blockaidError, setBlockaidError] = useState<string | null>(null);
  // Ref to track the current validation ID to prevent race conditions
  const currentValidationIdRef = useRef<number>(0);

  const {
    quoteFetchError,
    quotesLoadingStatus,
    quotesLastFetched,
    quotesRefreshCount,
  } = bridgeControllerState;

  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags, sourceToken);
  const maxRefreshCount = bridgeFeatureFlags?.maxRefreshCount ?? 5; // Default to 5 refresh attempts
  const insufficientBal = useIsInsufficientBalance({
    amount: sourceAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceAtomicBalance,
  });

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

    if (
      amount == null ||
      valueInCurrency == null ||
      !isNumberValue(amount) ||
      !isNumberValue(valueInCurrency)
    ) {
      return '-';
    }

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

    const priceImpact = quote.priceData?.priceImpact;
    let priceImpactPercentage;

    if (priceImpact) {
      priceImpactPercentage = `${(Number(priceImpact) * 100).toFixed(2)}%`;
    }

    // Formats quote rate to show an appropriate number of decimal places
    // For numbers greater than 1, we show 2 decimal places. Example: 1.23456 -> 1.23
    // For numbers less than 1, we show 3 significant digits. Example: 0.00012345 -> 0.000123
    const quoteRateFormatter = getIntlNumberFormatter(locale, {
      ...(quoteRate && quoteRate > 1
        ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
        : { minimumSignificantDigits: 2, maximumSignificantDigits: 3 }),
    });
    const formattedQuoteRate = quoteRateFormatter.format(quoteRate ?? 0);
    const rate = quoteRate
      ? `1 ${sourceToken?.symbol} = ${formattedQuoteRate} ${destToken?.symbol}`
      : '--';

    return {
      networkFee: getNetworkFee(),
      estimatedTime:
        estimatedProcessingTimeInSeconds >= 60
          ? `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`
          : `${
              estimatedProcessingTimeInSeconds >= 1
                ? `${estimatedProcessingTimeInSeconds} seconds`
                : '< 1 second'
            }`,
      rate,
      priceImpact: priceImpactPercentage,
      slippage: slippage ? `${slippage}%` : 'Auto',
    };
  }, [
    activeQuote,
    quoteRate,
    sourceToken?.symbol,
    destToken?.symbol,
    getNetworkFee,
    slippage,
    locale,
  ]);

  const isLoading = quotesLoadingStatus === RequestStatus.LOADING;

  const isNoQuotesAvailable = Boolean(
    !bestQuote && quotesLastFetched && !isLoading,
  );

  const validateQuote = useCallback(async () => {
    // Increment validation ID for this request
    const validationId = ++currentValidationIdRef.current;

    if (activeQuote && (isSolanaSwap || isSolanaToEvm)) {
      try {
        const validationResult = await validateBridgeTx({
          quoteResponse: activeQuote,
        });

        // Check if this is still the current validation after async operation
        if (validationId !== currentValidationIdRef.current) {
          // This validation is outdated, ignore the result
          return;
        }

        if (validationResult.status === 'ERROR') {
          const isValidationError = !!validationResult.result.validation.reason;
          const { error_details } = validationResult;
          const fallbackErrorMessage = isValidationError
            ? validationResult.result.validation.reason
            : validationResult.error;
          const error = error_details?.message
            ? `The ${error_details.message}.`
            : fallbackErrorMessage;
          setBlockaidError(error);
        } else {
          setBlockaidError(null);
        }
      } catch (error) {
        // Check if this is still the current validation after async operation
        if (validationId !== currentValidationIdRef.current) {
          // This validation is outdated, ignore the result
          return;
        }

        console.error('Validation error:', error);
        setBlockaidError(null);
      }
    } else {
      setBlockaidError(null);
    }
  }, [activeQuote, isSolanaSwap, isSolanaToEvm, validateBridgeTx]);

  useEffect(() => {
    validateQuote();
  }, [validateQuote]);

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
    blockaidError,
  };
};
