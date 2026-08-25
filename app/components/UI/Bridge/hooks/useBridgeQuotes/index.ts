import { useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { debounce } from 'lodash';

import {
  type GenericQuoteRequest,
  isValidQuoteRequest,
  type FeatureId,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo } from 'react';

import useIsInsufficientBalance from '../useInsufficientBalance';
import { BigNumber as EthersBigNumber } from 'ethers';

import type { BridgeToken } from '../../types';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import {
  selectBridgeControllerState,
  selectBridgeFeatureFlags,
  selectSlippage,
} from '../../../../../core/redux/slices/bridge';
import { calcTokenValue } from '../../../../../util/transactions';
import { TraceName } from '../../../../../util/trace';
import { useLatestBalance } from '../useLatestBalance';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
// eslint-disable-next-line import-x/no-restricted-paths
import { fromTokenMinimalUnit } from '../../../../../util/number';
import AppConstants from '../../../../../core/AppConstants';
import { parsePriceImpact } from '../../utils/getPriceImpactViewData';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useFormattedNetworkFee } from '../useFormattedNetworkFee';
import { usePriceImpactFiat } from '../usePriceImpactFiat';
import I18n from '../../../../../../locales/i18n';
import { useBlockaidError } from './useBlockaidError';
import { useValidQuotes } from './useValidQuotes';
import { swapQuoteFetchTrace } from '../../utils/swapQuoteFetchTrace';

interface UseBridgeQuotesParams {
  latestSourceAtomicBalance?: EthersBigNumber;
  quoteParams: {
    srcAmount?: string;
    srcToken?: BridgeToken;
    destToken?: BridgeToken;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
  };
}

export interface UseQuoteRequestParams extends UseBridgeQuotesParams {
  featureId: FeatureId;
  debounceWait: number;
  traceName?: TraceName;
  quoteRequestIndex?: number;
  quoteRequestCount?: number;
}

export interface UseQuoteDataParams extends UseBridgeQuotesParams {}

interface UpdateQuoteParamsOptions {
  isRefresh?: boolean;
  traceId?: string;
}

/**
 * Hook for handling bridge quote request updates
 * @returns An object with a debounced function to update quote parameters and a function to refresh quotes
 */
export const useQuoteRequest = ({
  traceName,
  quoteParams,
  latestSourceAtomicBalance,
  debounceWait,
  quoteRequestIndex = 0,
  quoteRequestCount = 1,
  featureId,
}: UseQuoteRequestParams) => {
  const {
    srcAmount,
    srcToken,
    destToken,
    walletAddress,
    destWalletAddress,
    slippage,
  } = quoteParams;

  const latestSourceBalance = useLatestBalance(
    latestSourceAtomicBalance
      ? {}
      : {
          address: srcToken?.address,
          decimals: srcToken?.decimals,
          chainId: srcToken?.chainId,
          balance: srcToken?.balance,
        },
  );
  const latestAtomicBalance =
    latestSourceAtomicBalance ?? latestSourceBalance?.atomicBalance;

  // Use simple balance check (ignoring gas fees) for quote requests to avoid circular dependencies.
  // The full balance check with gas fees is used separately within the BridgeView to block user from executing
  // the swap in insufficient balance.
  // This prevents the infinite loop: quote request → gas data changes → insufficientBal changes → new quote request
  const insufficientBalance = useIsInsufficientBalance({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance,
    ignoreGasFees: true,
  });

  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );

  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: srcAmount,
    token: srcToken,
    latestAtomicBalance,
    walletAddress,
  });

  const insufficientBal =
    insufficientBalance || Boolean(insufficientNativeReserveError);

  const quoteRequestParams: GenericQuoteRequest | undefined = useMemo(() => {
    if (!walletAddress || !srcToken || !destToken || srcAmount === undefined) {
      return;
    }
    const normalizedSourceAmount =
      srcAmount && srcToken?.decimals
        ? calcTokenValue(
            srcAmount === '.' ? '0' : srcAmount || '0',
            srcToken.decimals,
          ).toFixed(0)
        : '0';

    const slippageNumber = slippage ? Number(slippage) : undefined;

    return {
      srcChainId: srcToken?.chainId,
      srcTokenAddress: srcToken?.address,
      destChainId: destToken?.chainId,
      destTokenAddress: destToken?.address,
      srcTokenAmount: normalizedSourceAmount,
      slippage: Number.isNaN(slippageNumber) ? undefined : slippageNumber,
      walletAddress,
      destWalletAddress,
      gasIncluded,
      gasIncluded7702,
      insufficientBal,
    };
  }, [
    srcToken,
    destToken,
    srcAmount,
    walletAddress,
    destWalletAddress,
    slippage,
    gasIncluded,
    gasIncluded7702,
    insufficientBal,
  ]);

  const context = useUnifiedSwapBridgeContext(featureId);

  /**
   * Updates quote parameters in the bridge controller
   */
  const updateQuoteParams = useCallback(
    async (options?: UpdateQuoteParamsOptions) => {
      if (!quoteRequestParams) {
        return;
      }

      const shouldTrace =
        isValidQuoteRequest(quoteRequestParams) && Boolean(traceName);

      if (options?.traceId && !shouldTrace) {
        swapQuoteFetchTrace.finish('cancelled', options.traceId);
      }

      try {
        await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
          quoteRequestParams,
          context,
          quoteRequestIndex,
          quoteRequestCount,
        );
      } catch (error) {
        if (shouldTrace) {
          swapQuoteFetchTrace.finish('error', options?.traceId);
        }
        throw error;
      }
    },
    [
      context,
      quoteRequestIndex,
      quoteRequestCount,
      traceName,
      quoteRequestParams,
    ],
  );

  // Start the trace when the user commits a request, before the debounce timer.
  const debouncedUpdateQuoteParams = useMemo(() => {
    const debounced = debounce(updateQuoteParams, debounceWait);

    const debouncedWithTrace = (
      requestOptions: UpdateQuoteParamsOptions = {},
    ) => {
      if (
        !srcToken ||
        !destToken ||
        srcAmount === undefined ||
        !walletAddress
      ) {
        debounced.cancel();
        swapQuoteFetchTrace.finish('cancelled');
        return;
      }

      const traceId =
        srcAmount && srcAmount !== '.'
          ? swapQuoteFetchTrace.start({
              sourceToken: srcToken,
              destToken,
              isRefresh: requestOptions.isRefresh ?? false,
            })
          : undefined;

      if (!traceId) {
        swapQuoteFetchTrace.finish('cancelled');
      }

      debounced({
        ...requestOptions,
        traceId,
      });
    };

    debouncedWithTrace.cancel = () => {
      debounced.cancel();
      swapQuoteFetchTrace.finish('cancelled');
    };
    debouncedWithTrace.flush = () => debounced.flush();

    return debouncedWithTrace;
  }, [
    destToken,
    srcToken,
    srcAmount,
    updateQuoteParams,
    walletAddress,
    debounceWait,
  ]);

  useEffect(
    () => () => {
      debouncedUpdateQuoteParams.cancel();
    },
    [debouncedUpdateQuoteParams],
  );

  const refreshQuotes = useCallback(() => {
    debouncedUpdateQuoteParams({ isRefresh: true });
  }, [debouncedUpdateQuoteParams]);

  return useMemo(
    () => ({
      refreshQuotes,
      /** @deprecated update quoteRequest state through an internal useEffect hook instead */
      debouncedUpdateQuoteParams,
    }),
    [refreshQuotes, debouncedUpdateQuoteParams],
  );
};

export const useQuoteData = ({
  latestSourceAtomicBalance,
  quoteParams,
}: UseQuoteDataParams) => {
  const { quoteFetchError, quotesLoadingStatus } = useSelector(
    selectBridgeControllerState,
  );
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);

  const {
    activeQuote,
    bestQuote,
    isActiveQuoteForCurrentTokenPair,
    validQuotes,
    willRefresh,
    isExpired,
    needsNewQuote,
    isLoading,
    isNoQuotesAvailable,
  } = useValidQuotes({ latestSourceAtomicBalance, quoteParams });

  // Validate solana
  const blockaidError = useBlockaidError({ activeQuote });

  // Format quote data
  const destTokenAmount =
    activeQuote && quoteParams.destToken && isActiveQuoteForCurrentTokenPair
      ? fromTokenMinimalUnit(
          activeQuote.quote.dest.amount,
          quoteParams.destToken.decimals,
        )
      : undefined;

  const priceImpactFiat = usePriceImpactFiat(activeQuote);
  const networkFee = useFormattedNetworkFee(activeQuote);
  const slippage = useSelector(selectSlippage);
  // TODO use swapRate metadata
  // const quoteRate = activeQuote?.quote.priceData?.swapRate
  //   ? Number(activeQuote.quote.priceData.swapRate)
  //   : undefined;
  const quoteRate =
    Number(quoteParams.srcAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(quoteParams.srcAmount);

  const locale = I18n.locale;

  const formattedQuoteData = useMemo(() => {
    if (!activeQuote) return undefined;

    const { quote, estimatedProcessingTimeInSeconds } = activeQuote;

    const priceImpact = quote.priceData?.priceImpact?.amount;
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
      ? `1 ${quoteParams.srcToken?.symbol} = ${formattedQuoteRate} ${quoteParams.destToken?.symbol}`
      : '--';

    return {
      networkFee,
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
      priceImpactFiat,
      slippage: slippage ? `${slippage}%` : 'Auto',
    };
  }, [
    activeQuote,
    quoteRate,
    quoteParams.srcToken?.symbol,
    quoteParams.destToken?.symbol,
    slippage,
    locale,
    networkFee,
    priceImpactFiat,
  ]);

  const shouldShowPriceImpactWarning = Boolean(
    activeQuote?.quote.priceData?.priceImpact?.amount !== undefined &&
      bridgeFeatureFlags?.priceImpactThreshold &&
      parsePriceImpact(activeQuote?.quote.priceData?.priceImpact?.amount) >=
        (bridgeFeatureFlags.priceImpactThreshold.warning ??
          AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD),
  );

  return useMemo(
    () => ({
      activeQuote,
      bestQuote,
      blockaidError,
      destTokenAmount,
      formattedQuoteData,
      isActiveQuoteForCurrentTokenPair,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      quoteFetchError,
      quotesLoadingStatus,
      shouldShowPriceImpactWarning,
      validQuotes,
      willRefresh,
    }),
    [
      activeQuote,
      bestQuote,
      blockaidError,
      destTokenAmount,
      formattedQuoteData,
      isActiveQuoteForCurrentTokenPair,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      quoteFetchError,
      quotesLoadingStatus,
      shouldShowPriceImpactWarning,
      validQuotes,
      willRefresh,
    ],
  );
};
