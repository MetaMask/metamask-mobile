import { useDispatch, useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectSourceToken,
  selectDestToken,
  selectSourceAmount,
  selectSlippage,
  selectBridgeQuotes,
  selectIsSubmittingTx,
  selectBridgeFeatureFlags,
  selectIsSolanaSwap,
  selectIsSolanaToNonSolana,
  selectSelectedQuoteRequestId,
  setSelectedQuoteRequestId,
} from '../../../../../core/redux/slices/bridge';
import { RequestStatus, isNonEvmChainId } from '@metamask/bridge-controller';
import { areAddressesEqual } from '../../../../../util/address';
import { useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { fromTokenMinimalUnit } from '../../../../../util/number';
import {
  isQuoteExpired,
  getQuoteRefreshRate,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';
import I18n from '../../../../../../locales/i18n';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { BigNumber as EthersBigNumber } from 'ethers';
import useValidateBridgeTx from '../../../../../util/bridge/hooks/useValidateBridgeTx';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useFormattedNetworkFee } from '../useFormattedNetworkFee';
import AppConstants from '../../../../../core/AppConstants';

interface UseBridgeQuoteDataParams {
  latestSourceAtomicBalance?: EthersBigNumber;
}

/**
 * Hook for getting bridge quote data without request logic
 */
export const useBridgeQuoteData = ({
  latestSourceAtomicBalance,
}: UseBridgeQuoteDataParams = {}) => {
  const dispatch = useDispatch();
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const sourceAmount = useSelector(selectSourceAmount);
  const slippage = useSelector(selectSlippage);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const locale = I18n.locale;
  const quotes = useSelector(selectBridgeQuotes);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const isSolanaSwap = useSelector(selectIsSolanaSwap);
  const isSolanaToNonSolana = useSelector(selectIsSolanaToNonSolana);
  const selectedQuoteRequestId = useSelector(selectSelectedQuoteRequestId);
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
  const allQuotes = useMemo(
    () => quotes?.sortedQuotes ?? [],
    [quotes?.sortedQuotes],
  );

  // Determine the active quote:
  // 1. If user manually selected a quote, use that
  // 2. Otherwise, use the best quote
  // 3. If expired and not refreshing, use undefined
  const manuallySelectedQuote = selectedQuoteRequestId
    ? allQuotes.find(
        (quote) => quote.quote.requestId === selectedQuoteRequestId,
      )
    : undefined;

  const activeQuote =
    isExpired && !willRefresh && !isSubmittingTx
      ? undefined
      : (manuallySelectedQuote ?? bestQuote);

  // Validate that the quote's source asset matches the selected source token
  // This prevents showing stale quote data when user changes source token on the same chain
  const isQuoteSourceTokenMatch = useMemo(() => {
    if (!activeQuote || !sourceToken) return false;

    const { srcAsset } = activeQuote.quote;

    const quoteSourceAddress = isNonEvmChainId(sourceToken.chainId)
      ? (srcAsset.assetId ?? srcAsset.address)
      : srcAsset.address;

    const selectedSourceAddress = sourceToken.address;
    return areAddressesEqual(quoteSourceAddress, selectedSourceAddress);
  }, [activeQuote, sourceToken]);

  // Helper to validate that a quote's destination asset matches the selected destination token
  // This prevents showing stale quote data (with wrong decimals) when user changes destination token
  const isQuoteDestTokenMatchForQuote = useCallback(
    (quote: (typeof allQuotes)[number] | undefined | null): boolean => {
      if (!quote || !destToken) return false;

      const { destAsset } = quote.quote;

      // For non-EVM chains (e.g., Solana), destAsset.address is in raw format (e.g., "EPj...")
      // or zero address for native tokens, while destToken.address uses CAIP format
      // (e.g., "solana:.../token:EPj...").
      // Use destAsset.assetId (CAIP format) for comparison.
      // For EVM chains, use the original address comparison.
      const quoteDestAddress = isNonEvmChainId(destToken.chainId)
        ? (destAsset.assetId ?? destAsset.address)
        : destAsset.address;

      const selectedDestAddress = destToken.address;
      return areAddressesEqual(quoteDestAddress, selectedDestAddress);
    },
    [destToken],
  );

  const isQuoteDestTokenMatch = isQuoteDestTokenMatchForQuote(activeQuote);

  // Filter all quotes to only include valid ones (not expired and matching dest token)
  const validQuotes = useMemo(
    () =>
      isExpired && !willRefresh && !isSubmittingTx
        ? []
        : allQuotes.filter((quote) => isQuoteDestTokenMatchForQuote(quote)),
    [
      isExpired,
      willRefresh,
      isSubmittingTx,
      allQuotes,
      isQuoteDestTokenMatchForQuote,
    ],
  );

  const destTokenAmount =
    activeQuote && destToken && isQuoteSourceTokenMatch && isQuoteDestTokenMatch
      ? fromTokenMinimalUnit(
          activeQuote.quote.destTokenAmount,
          destToken.decimals,
        )
      : undefined;

  const quoteRate =
    Number(sourceAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(sourceAmount);

  const networkFee = useFormattedNetworkFee(activeQuote);

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
      slippage: slippage ? `${slippage}%` : 'Auto',
    };
  }, [
    activeQuote,
    quoteRate,
    sourceToken?.symbol,
    destToken?.symbol,
    slippage,
    locale,
    networkFee,
  ]);

  const isLoading = quotesLoadingStatus === RequestStatus.LOADING;

  const isNoQuotesAvailable = Boolean(
    !bestQuote && quotesLastFetched && !isLoading,
  );

  // The quote expired and no fetch is in progress — offer to get a new one.
  // Also treat the edge-case where a fetch IS running but there is no active
  // quote to fall back on — the user would otherwise be stuck on a spinner
  // with no way to retry ("escape hatch").
  const needsNewQuote =
    isExpired && !isSubmittingTx && (!isLoading || !activeQuote);

  const shouldShowPriceImpactWarning = Boolean(
    activeQuote?.quote.priceData?.priceImpact !== undefined &&
      bridgeFeatureFlags?.priceImpactThreshold &&
      Number(activeQuote?.quote.priceData?.priceImpact) >=
        // @ts-expect-error TODO: remove comment after changes to core are published.
        (bridgeFeatureFlags.priceImpactThreshold.warning ??
          AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD),
  );

  const abortController = useRef<AbortController | null>(new AbortController());
  useEffect(
    () => () => {
      abortController.current?.abort();
      abortController.current = null;
    },
    [],
  );

  const validateQuote = useCallback(async () => {
    // Increment validation ID for this request
    const validationId = ++currentValidationIdRef.current;
    // Cancel any ongoing request
    abortController.current?.abort();
    abortController.current = new AbortController();

    if (activeQuote && (isSolanaSwap || isSolanaToNonSolana)) {
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
        setBlockaidError(null);
      }
    } else {
      setBlockaidError(null);
    }
  }, [activeQuote, isSolanaSwap, isSolanaToNonSolana, validateBridgeTx]);

  useEffect(() => {
    validateQuote();
  }, [validateQuote]);

  useEffect(() => {
    if (!manuallySelectedQuote) {
      dispatch(setSelectedQuoteRequestId(undefined));
    }
  }, [manuallySelectedQuote, dispatch]);

  return {
    bestQuote,
    quoteFetchError,
    activeQuote,
    quotesLoadingStatus,
    destTokenAmount,
    isLoading,
    formattedQuoteData,
    isNoQuotesAvailable,
    willRefresh,
    isExpired,
    blockaidError,
    shouldShowPriceImpactWarning,
    validQuotes,
    needsNewQuote,
  };
};
