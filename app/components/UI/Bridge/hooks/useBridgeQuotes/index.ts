import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../../core/Engine';
import { debounce } from 'lodash';

import {
  type GenericQuoteRequest,
  isValidQuoteRequest,
  type FeatureId,
  RequestStatus,
  isNonEvmChainId,
  formatAddressToCaipReference,
  formatChainIdToCaip,
} from '@metamask/bridge-controller';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import useIsInsufficientBalance from '../useInsufficientBalance';
import { BigNumber as EthersBigNumber } from 'ethers';

import type { BridgeToken } from '../../types';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
  selectIsSubmittingTx,
  selectBridgeFeatureFlags,
  selectSelectedQuoteRequestId,
  selectQuoteStreamComplete,
  selectSlippage,
  selectIsSolanaToNonSolana,
  selectIsSolanaSwap,
  setSelectedQuoteRequestId,
} from '../../../../../core/redux/slices/bridge';
import { calcTokenValue } from '../../../../../util/transactions';
import { TraceName, endTrace, trace } from '../../../../../util/trace';
import { useLatestBalance } from '../useLatestBalance';
import { useUnifiedSwapBridgeContext } from '../useUnifiedSwapBridgeContext';
import {
  getQuoteRefreshRate,
  isQuoteExpired,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';
import { areAddressesEqual } from '../../../../../util/address';
import { parseCaipAssetType } from '@metamask/utils';
import { fromTokenMinimalUnit } from '../../../../../util/number';
import AppConstants from '../../../../../core/AppConstants';
import { parsePriceImpact } from '../../utils/getPriceImpactViewData';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useFormattedNetworkFee } from '../useFormattedNetworkFee';
import { usePriceImpactFiat } from '../usePriceImpactFiat';
import I18n from '../../../../../../locales/i18n';
import useValidateBridgeTx from '../../../../../util/bridge/hooks/useValidateBridgeTx';

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
    async (options?: { isRefresh?: boolean }, params?: GenericQuoteRequest) => {
      const paramsToUse = params ?? quoteRequestParams;
      if (!paramsToUse) {
        return;
      }

      const shouldTrace = isValidQuoteRequest(paramsToUse) && traceName;

      try {
        if (shouldTrace) {
          trace({
            name: traceName,
            data: { isRefresh: options?.isRefresh ?? false },
            startTime: Date.now(),
          });
        }

        await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
          paramsToUse,
          context,
          quoteRequestIndex,
          quoteRequestCount,
        );
      } catch (error) {
        if (shouldTrace) {
          endTrace({
            name: traceName,
            timestamp: Date.now(),
            data: { success: false },
          });
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

  // Create a stable debounced function that persists across renders
  const debouncedUpdateQuoteParams = useMemo(
    () => debounce(updateQuoteParams, debounceWait),
    [updateQuoteParams],
  );

  const refreshQuotes = useCallback(() => {
    debouncedUpdateQuoteParams({ isRefresh: true }, quoteRequestParams);
  }, [debouncedUpdateQuoteParams, quoteRequestParams]);

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
  const { recommendedQuote, sortedQuotes } = useSelector(selectBridgeQuotes);
  const {
    quoteFetchError,
    quotesLoadingStatus,
    quotesLastFetched,
    quotesRefreshCount,
  } = useSelector(selectBridgeControllerState);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const selectedQuoteRequestId = useSelector(selectSelectedQuoteRequestId);
  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);

  const refreshRate = getQuoteRefreshRate(
    bridgeFeatureFlags,
    quoteParams.srcToken,
  );
  const maxRefreshCount = bridgeFeatureFlags?.maxRefreshCount ?? 5; // Default to 5 refresh attempts
  const insufficientBalForQuote = useIsInsufficientBalance({
    amount: quoteParams.srcAmount,
    token: quoteParams.srcToken,
    latestAtomicBalance: latestSourceAtomicBalance,
  });

  const willRefresh = shouldRefreshQuote(
    insufficientBalForQuote ?? false,
    quotesRefreshCount,
    maxRefreshCount,
    isSubmittingTx,
  );

  const isExpired = isQuoteExpired(willRefresh, refreshRate, quotesLastFetched);
  const isNoQuotesAvailable = quoteStreamComplete?.hasQuotes === false;

  // TODO determine activeQuote
  const allQuotes = useMemo(() => sortedQuotes ?? [], [sortedQuotes]);

  // Determine the active quote:
  // 1. If user manually selected a quote, use that
  // 2. Otherwise, use the best quote
  // 3. If expired and not refreshing, use undefined
  const manuallySelectedQuote = selectedQuoteRequestId
    ? allQuotes.find(
        (quote) => quote.quote.requestId === selectedQuoteRequestId,
      )
    : undefined;

  const rawActiveQuote =
    isExpired && !willRefresh && !isSubmittingTx
      ? undefined
      : (manuallySelectedQuote ?? recommendedQuote);

  // When quotes are expired but the user hasn't yet triggered a new fetch,
  // keep showing the last quotes that are still present in Redux. They are NOT
  // cleared from the store on expiry — only BridgeController.resetState()
  // (called on "Get new quote") removes them. Reading from Redux directly means
  // every consumer of this hook (BridgeView, QuoteSelectorView, …) sees the
  // same cached data without needing per-instance refs.
  const isShowingCachedQuote =
    isExpired &&
    !willRefresh &&
    !isSubmittingTx &&
    quotesLoadingStatus !== RequestStatus.LOADING &&
    !!(manuallySelectedQuote ?? recommendedQuote);

  const activeQuote = isShowingCachedQuote
    ? (manuallySelectedQuote ?? recommendedQuote)
    : rawActiveQuote;

  // tODO use assetIdsMatch
  // TODO validate quote
  // Validate that the quote's source asset matches the selected source token
  // This prevents showing stale quote data when user changes source token on the same chain
  const isQuoteSourceTokenMatch = useMemo(() => {
    if (!activeQuote || !quoteParams.srcToken) return false;

    const {
      src: { asset: srcAsset },
    } = activeQuote.quote;

    const srcChainId = activeQuote.chainId;

    const quoteSourceAddress = isNonEvmChainId(quoteParams.srcToken.chainId)
      ? srcAsset.assetId
      : formatAddressToCaipReference(srcAsset.assetId);

    const selectedSourceAddress = quoteParams.srcToken.address;
    return (
      srcChainId === formatChainIdToCaip(quoteParams.srcToken.chainId) &&
      areAddressesEqual(quoteSourceAddress, selectedSourceAddress)
    );
  }, [activeQuote, quoteParams.srcToken]);
  // Helper to validate that a quote's destination asset matches the selected destination token
  // This prevents showing stale quote data (with wrong decimals) when user changes destination token
  const isQuoteDestTokenMatchForQuote = useCallback(
    (quote: (typeof allQuotes)[number] | undefined | null): boolean => {
      if (!quote || !quoteParams.destToken) return false;

      const {
        dest: { asset: destAsset },
      } = quote.quote;
      const destChainId = parseCaipAssetType(destAsset.assetId).chainId;

      // For non-EVM chains (e.g., Solana), destAsset.address is in raw format (e.g., "EPj...")
      // or zero address for native tokens, while destToken.address uses CAIP format
      // (e.g., "solana:.../token:EPj...").
      // Use destAsset.assetId (CAIP format) for comparison.
      // For EVM chains, use the original address comparison.
      const quoteDestAddress = isNonEvmChainId(quoteParams.destToken.chainId)
        ? destAsset.assetId
        : formatAddressToCaipReference(destAsset.assetId);

      const selectedDestAddress = quoteParams.destToken.address;
      return (
        destChainId === formatChainIdToCaip(quoteParams.destToken.chainId) &&
        areAddressesEqual(quoteDestAddress, selectedDestAddress)
      );
    },
    [quoteParams.destToken],
  );

  const isQuoteDestTokenMatch = isQuoteDestTokenMatchForQuote(activeQuote);
  const isActiveQuoteForCurrentTokenPair =
    isQuoteSourceTokenMatch && isQuoteDestTokenMatch;

  // Filter all quotes to only include valid ones (not expired and matching dest token).
  // When showing cached data the expiry guard is bypassed so the Redux quotes
  // that are still in the store remain visible until the user requests new ones.
  const validQuotes = useMemo(
    () =>
      isExpired && !willRefresh && !isSubmittingTx && !isShowingCachedQuote
        ? []
        : allQuotes.filter((quote) => isQuoteDestTokenMatchForQuote(quote)),
    [
      isExpired,
      willRefresh,
      isSubmittingTx,
      isShowingCachedQuote,
      allQuotes,
      isQuoteDestTokenMatchForQuote,
    ],
  );

  // TODO format quote data
  const destTokenAmount =
    activeQuote &&
    quoteParams.destToken &&
    isQuoteSourceTokenMatch &&
    isQuoteDestTokenMatch
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

  // TODO use swapRate metadata
  // const quoteRate = activeQuote?.quote.priceData?.swapRate
  //   ? Number(activeQuote.quote.priceData.swapRate)
  //   : undefined;
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

  // TODO check if new quotes will be fetched
  const isLoading = quotesLoadingStatus === RequestStatus.LOADING;
  // Show "Get new quote" only when an expired quote needs refresh.
  const needsNewQuote =
    isExpired && !isSubmittingTx && (!isLoading || !activeQuote);

  // Validate solana
  const { validateBridgeTx } = useValidateBridgeTx();
  const [blockaidError, setBlockaidError] = useState<string | null>(null);
  // Ref to track the current validation ID to prevent race conditions
  const currentValidationIdRef = useRef<number>(0);
  const lastValidatedQuoteRef = useRef<{
    requestId: string;
    validateBridgeTx: typeof validateBridgeTx;
  } | null>(null);

  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isSolanaToNonSolana = useSelector(selectIsSolanaToNonSolana);

  const abortController = useRef<AbortController | null>(new AbortController());
  useEffect(
    () => () => {
      abortController.current?.abort();
      abortController.current = null;
    },
    [],
  );

  const validateQuote = useCallback(async () => {
    if (
      !activeQuote ||
      (!isSolanaSwap && !isSolanaToNonSolana) ||
      // Skip validation for gas-included quotes on Solana
      activeQuote?.quote?.gasIncluded === true
    ) {
      lastValidatedQuoteRef.current = null;
      setBlockaidError(null);
      return;
    }

    const activeQuoteRequestId = activeQuote.quote.requestId;
    const hasValidatedCurrentQuote =
      lastValidatedQuoteRef.current?.requestId === activeQuoteRequestId &&
      lastValidatedQuoteRef.current?.validateBridgeTx === validateBridgeTx;

    if (hasValidatedCurrentQuote) {
      return;
    }

    lastValidatedQuoteRef.current = {
      requestId: activeQuoteRequestId,
      validateBridgeTx,
    };

    // Increment validation ID for this request
    const validationId = ++currentValidationIdRef.current;
    // Cancel any ongoing request
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      const validationResult = await validateBridgeTx({
        quoteResponse: activeQuote,
        signal: abortController.current?.signal,
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

      console.error('Swaps Quote Data Validation error:', error);
      if (
        lastValidatedQuoteRef.current?.requestId === activeQuoteRequestId &&
        lastValidatedQuoteRef.current?.validateBridgeTx === validateBridgeTx
      ) {
        lastValidatedQuoteRef.current = null;
      }
      setBlockaidError(null);
    }
  }, [activeQuote, isSolanaSwap, isSolanaToNonSolana, validateBridgeTx]);

  useEffect(() => {
    validateQuote();
  }, [validateQuote]);

  // Unset manually selected quote when no quote is selected
  const dispatch = useDispatch();
  useEffect(() => {
    if (!manuallySelectedQuote) {
      dispatch(setSelectedQuoteRequestId(undefined));
    }
  }, [manuallySelectedQuote, dispatch]);

  return useMemo(
    () => ({
      activeQuote,
      bestQuote: recommendedQuote,
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
      recommendedQuote,
      shouldShowPriceImpactWarning,
      validQuotes,
      willRefresh,
    ],
  );
};
