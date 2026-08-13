import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { debounce } from 'lodash';
import {
  FeatureId,
  RequestStatus,
  assetIdsMatch,
  formatAddressToAssetId,
  formatAddressToCaipReference,
  formatChainIdToCaip,
  isNonEvmChainId,
  isSolanaChainId,
  isValidQuoteRequest,
  type GenericQuoteRequest,
  type QuoteResponse,
} from '@metamask/bridge-controller';
import {
  CaipAssetType,
  KnownCaipNamespace,
  parseCaipAssetType,
} from '@metamask/utils';
import type { BigNumber as EthersBigNumber } from 'ethers';

import Engine from '../../../../../core/Engine';
import AppConstants from '../../../../../core/AppConstants';
import {
  selectBatchSellQuotes,
  selectBridgeControllerState,
  selectBridgeFeatureFlags,
  selectBridgeQuotes,
  selectIsSubmittingTx,
  selectQuoteStreamComplete,
  selectSelectedQuoteRequestId,
  setSelectedQuoteRequestId,
} from '../../../../../core/redux/slices/bridge';
import { selectGasIncludedQuoteParams } from '../../../../../selectors/bridge';
import { areAddressesEqual } from '../../../../../util/address';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { fromTokenMinimalUnit } from '../../../../../util/number/bigint';
import { getDecimalChainId } from '../../../../../util/networks';
import { calcTokenValue } from '../../../../../util/transactions';
import { endTrace, trace, TraceName } from '../../../../../util/trace';
import useValidateBridgeTx from '../../../../../util/bridge/hooks/useValidateBridgeTx';
import I18n from '../../../../../../locales/i18n';
import { parsePriceImpact } from '../../utils/getPriceImpactViewData';
import {
  getQuoteRefreshRate,
  isQuoteExpired,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';
import useIsInsufficientBalance from '../useInsufficientBalance';
import { useInsufficientNativeReserveError } from '../useInsufficientNativeReserveError';
import { useLatestBalance } from '../useLatestBalance';
import { useFormattedNetworkFee } from '../useFormattedNetworkFee';
import { usePriceImpactFiat } from '../usePriceImpactFiat';
import type { BridgeToken } from '../../types';

export const BRIDGE_QUOTES_DEBOUNCE_MS = 300;

const isBatchSellConfig = (config: {
  analyticsContext: { feature_id?: FeatureId };
}) => config.analyticsContext.feature_id === FeatureId.BATCH_SELL;

const useBridgeQuotesRequest = ({
  config,
  managedRequest = false,
}: {
  config: Pick<
    GenericQuoteRequest,
    'srcTokenAmount' | 'slippage' | 'walletAddress' | 'destWalletAddress'
  > & {
    sourceToken?: BridgeToken;
    destToken?: BridgeToken;
    analyticsContext: Parameters<
      typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
    >[1];
    quoteRequestIndex?: Parameters<
      typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
    >[2];
    quoteRequestCount?: Parameters<
      typeof Engine.context.BridgeController.updateBridgeQuoteRequestParams
    >[3];
    latestSourceAtomicBalance?: EthersBigNumber;
  };
  managedRequest?: boolean;
}) => {
  const {
    sourceToken,
    destToken,
    srcTokenAmount,
    slippage,
    destWalletAddress,
    walletAddress,
    quoteRequestIndex = 0,
    quoteRequestCount = 1,
    analyticsContext,
    latestSourceAtomicBalance,
  } = config;
  const destChainId = destToken?.chainId;
  const isBatchSell = isBatchSellConfig(config);
  const hasLatestSourceBalanceOverride = 'latestSourceAtomicBalance' in config;

  const latestSourceBalance = useLatestBalance(
    hasLatestSourceBalanceOverride
      ? {}
      : {
          address: sourceToken?.address,
          decimals: sourceToken?.decimals,
          chainId: sourceToken?.chainId,
          balance: sourceToken?.balance,
        },
  );

  const sourceAtomicBalance = hasLatestSourceBalanceOverride
    ? latestSourceAtomicBalance
    : latestSourceBalance?.atomicBalance;

  const insufficientBalance = useIsInsufficientBalance({
    amount: srcTokenAmount,
    token: sourceToken,
    latestAtomicBalance: sourceAtomicBalance,
    ignoreGasFees: true,
  });

  const { gasIncluded, gasIncluded7702 } = useSelector(
    selectGasIncludedQuoteParams,
  );

  const insufficientNativeReserveError = useInsufficientNativeReserveError({
    amount: srcTokenAmount,
    token: sourceToken,
    latestAtomicBalance: sourceAtomicBalance,
    walletAddress,
  });

  const insufficientBal =
    insufficientBalance || Boolean(insufficientNativeReserveError);

  const updateQuoteParams = useCallback(
    async ({ isRefresh = false }: { isRefresh?: boolean } = {}) => {
      if (
        !sourceToken ||
        !destToken ||
        srcTokenAmount === undefined ||
        !destChainId ||
        !walletAddress
      ) {
        return;
      }

      const normalizedSourceAmount =
        srcTokenAmount && sourceToken.decimals
          ? calcTokenValue(
              srcTokenAmount === '.' ? '0' : srcTokenAmount || '0',
              sourceToken.decimals,
            ).toFixed(0)
          : '0';

      const params: GenericQuoteRequest = {
        srcChainId: getDecimalChainId(sourceToken.chainId),
        srcTokenAddress: formatAddressToCaipReference(sourceToken.address),
        destChainId: getDecimalChainId(destChainId),
        destTokenAddress: formatAddressToCaipReference(destToken.address),
        srcTokenAmount: normalizedSourceAmount,
        slippage: slippage ? Number(slippage) : undefined,
        walletAddress,
        destWalletAddress: destWalletAddress ?? walletAddress,
        gasIncluded: isBatchSell ? false : gasIncluded,
        gasIncluded7702: isBatchSell ? false : gasIncluded7702,
        insufficientBal: isBatchSell ? false : insufficientBal,
      };

      const shouldTrace = !isBatchSell && isValidQuoteRequest(params);

      try {
        if (shouldTrace) {
          trace({
            name: TraceName.SwapQuoteFetch,
            data: { isRefresh },
            startTime: Date.now(),
          });
        }

        await Engine.context.BridgeController.updateBridgeQuoteRequestParams(
          params,
          analyticsContext,
          quoteRequestIndex,
          quoteRequestCount,
        );
      } catch (error) {
        if (shouldTrace) {
          endTrace({
            name: TraceName.SwapQuoteFetch,
            timestamp: Date.now(),
            data: { success: false },
          });
        }
        throw error;
      }
    },
    [
      analyticsContext,
      destWalletAddress,
      destChainId,
      destToken,
      gasIncluded,
      gasIncluded7702,
      insufficientBal,
      isBatchSell,
      quoteRequestCount,
      quoteRequestIndex,
      slippage,
      srcTokenAmount,
      sourceToken,
      walletAddress,
    ],
  );

  return useMemo(
    () =>
      managedRequest
        ? updateQuoteParams
        : debounce(updateQuoteParams, BRIDGE_QUOTES_DEBOUNCE_MS),
    [managedRequest, updateQuoteParams],
  );
};

const useBridgeQuotesData = ({
  config,
}: Pick<Parameters<typeof useBridgeQuotesRequest>[0], 'config'>) => {
  const dispatch = useDispatch();
  const {
    sourceToken,
    destToken,
    srcTokenAmount,
    slippage,
    latestSourceAtomicBalance,
  } = config;
  const isBatchSell = isBatchSellConfig(config);
  const locale = I18n.locale;
  const bridgeControllerState = useSelector(selectBridgeControllerState);
  const bridgeQuotes = useSelector(selectBridgeQuotes);
  const batchSellQuotes = useSelector(selectBatchSellQuotes);
  const isSubmittingTx = useSelector(selectIsSubmittingTx);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const selectedQuoteRequestId = useSelector(selectSelectedQuoteRequestId);
  const quoteStreamComplete = useSelector(selectQuoteStreamComplete);
  const { validateBridgeTx } = useValidateBridgeTx();

  const [blockaidError, setBlockaidError] = useState<string | null>(null);
  const currentValidationIdRef = useRef(0);
  const lastValidatedQuoteRef = useRef<{
    requestId: string;
    validateBridgeTx: typeof validateBridgeTx;
  } | null>(null);

  const isSolanaSwap = Boolean(
    sourceToken &&
      destToken &&
      isSolanaChainId(sourceToken.chainId) &&
      isSolanaChainId(destToken.chainId),
  );
  const isSolanaToNonSolana = Boolean(
    sourceToken &&
      destToken &&
      isSolanaChainId(sourceToken.chainId) &&
      !isSolanaChainId(destToken.chainId),
  );

  const {
    quoteFetchError: unifiedQuoteFetchError,
    quotesLoadingStatus,
    quotesLastFetched,
    quotesRefreshCount,
  } = bridgeControllerState;

  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags, sourceToken);
  const maxRefreshCount = bridgeFeatureFlags?.maxRefreshCount ?? 5;
  const insufficientBal = useIsInsufficientBalance({
    amount: srcTokenAmount,
    token: sourceToken,
    latestAtomicBalance: latestSourceAtomicBalance,
  });

  const willRefresh = isBatchSell
    ? batchSellQuotes.isQuoteGoingToRefresh
    : shouldRefreshQuote(
        insufficientBal ?? false,
        quotesRefreshCount,
        maxRefreshCount,
        isSubmittingTx,
      );

  const quotesLastFetchedMs = isBatchSell
    ? (batchSellQuotes.quotesLastFetchedMs ?? null)
    : quotesLastFetched;

  const isExpired = isQuoteExpired(
    willRefresh,
    refreshRate,
    quotesLastFetchedMs,
  );

  const sourceAssetId = sourceToken
    ? formatAddressToAssetId(sourceToken.address, sourceToken.chainId)
    : undefined;
  const destAssetId = destToken
    ? formatAddressToAssetId(destToken.address, destToken.chainId)
    : undefined;

  const batchPairQuote = useMemo(() => {
    if (!isBatchSell || !sourceAssetId) {
      return undefined;
    }

    return (batchSellQuotes.recommendedQuotes ?? []).find(
      (quote): quote is NonNullable<typeof quote> => {
        if (!quote) return false;

        return Boolean(
          assetIdsMatch(quote.quote.src.asset.assetId, sourceAssetId) &&
            assetIdsMatch(quote.quote.dest.asset.assetId, destAssetId),
        );
      },
    );
  }, [
    batchSellQuotes.recommendedQuotes,
    destAssetId,
    isBatchSell,
    sourceAssetId,
  ]);

  const recommendedQuote = isBatchSell
    ? (batchPairQuote ?? null)
    : (bridgeQuotes?.recommendedQuote ?? null);
  const allQuotes = useMemo(() => {
    if (isBatchSell) {
      return batchPairQuote ? [batchPairQuote] : [];
    }

    return bridgeQuotes?.sortedQuotes ?? [];
  }, [batchPairQuote, bridgeQuotes?.sortedQuotes, isBatchSell]);

  const manuallySelectedQuote =
    !isBatchSell && selectedQuoteRequestId
      ? allQuotes.find(
          (quote) => quote.quote.requestId === selectedQuoteRequestId,
        )
      : undefined;

  const rawActiveQuote =
    isExpired && !willRefresh && !isSubmittingTx
      ? null
      : (manuallySelectedQuote ?? recommendedQuote);

  const isShowingCachedQuote =
    isExpired &&
    !willRefresh &&
    !isSubmittingTx &&
    quotesLoadingStatus !== RequestStatus.LOADING &&
    !!(manuallySelectedQuote ?? recommendedQuote);

  const activeQuote = isShowingCachedQuote
    ? (manuallySelectedQuote ?? recommendedQuote)
    : rawActiveQuote;

  const priceImpactFiat = usePriceImpactFiat(activeQuote);

  const isQuoteSourceTokenMatch = useMemo(() => {
    if (!activeQuote || !sourceToken) return false;

    const {
      src: { asset: srcAsset },
    } = activeQuote.quote;

    const srcChainId = activeQuote.chainId;

    const quoteSourceAddress = isNonEvmChainId(sourceToken.chainId)
      ? srcAsset.assetId
      : formatAddressToCaipReference(srcAsset.assetId);

    return (
      srcChainId === formatChainIdToCaip(sourceToken.chainId) &&
      areAddressesEqual(quoteSourceAddress, sourceToken.address)
    );
  }, [activeQuote, sourceToken]);

  const isQuoteDestTokenMatchForQuote = useCallback(
    (quote: QuoteResponse | undefined | null) => {
      if (!quote || !destToken) return false;

      const {
        dest: { asset: destAsset },
      } = quote.quote;
      const destChainId = parseCaipAssetType(destAsset.assetId).chainId;

      const quoteDestAddress = isNonEvmChainId(destToken.chainId)
        ? destAsset.assetId
        : formatAddressToCaipReference(destAsset.assetId);

      return (
        destChainId === formatChainIdToCaip(destToken.chainId) &&
        areAddressesEqual(quoteDestAddress, destToken.address)
      );
    },
    [destToken],
  );

  const isQuoteDestTokenMatch = isQuoteDestTokenMatchForQuote(activeQuote);

  const sortedQuotes = useMemo(
    () =>
      isExpired && !willRefresh && !isSubmittingTx && !isShowingCachedQuote
        ? []
        : allQuotes.filter((quote) => isQuoteDestTokenMatchForQuote(quote)),
    [
      allQuotes,
      isExpired,
      isQuoteDestTokenMatchForQuote,
      isShowingCachedQuote,
      isSubmittingTx,
      willRefresh,
    ],
  );

  const destTokenAmount =
    activeQuote && destToken && isQuoteSourceTokenMatch && isQuoteDestTokenMatch
      ? fromTokenMinimalUnit(activeQuote.quote.dest.amount, destToken.decimals)
      : undefined;

  const quoteRate =
    Number(srcTokenAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(srcTokenAmount);

  const networkFee = useFormattedNetworkFee(activeQuote);

  const formattedQuoteData = useMemo(() => {
    if (!activeQuote) return undefined;

    const { quote, estimatedProcessingTimeInSeconds } = activeQuote;
    const priceImpact = quote.priceData?.priceImpact?.amount;
    let priceImpactPercentage;

    if (priceImpact) {
      priceImpactPercentage = `${(Number(priceImpact) * 100).toFixed(2)}%`;
    }

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
      priceImpactFiat,
      slippage: slippage ? `${slippage}%` : 'Auto',
      receivedAmount: destTokenAmount,
      receivedAmountFiat: quote.dest.valueInCurrency ?? undefined,
    };
  }, [
    activeQuote,
    destToken?.symbol,
    destTokenAmount,
    locale,
    networkFee,
    priceImpactFiat,
    quoteRate,
    slippage,
    sourceToken?.symbol,
  ]);

  const isLoading = isBatchSell
    ? batchSellQuotes.isLoading
    : quotesLoadingStatus === RequestStatus.LOADING;

  const isNoQuotesAvailable = isBatchSell
    ? !isLoading && !activeQuote && Boolean(quotesLastFetchedMs)
    : quoteStreamComplete?.hasQuotes === false;

  const needsNewQuote =
    isExpired && !isSubmittingTx && (!isLoading || !activeQuote);

  const shouldShowPriceImpactWarning = Boolean(
    activeQuote?.quote.priceData?.priceImpact?.amount !== undefined &&
      bridgeFeatureFlags?.priceImpactThreshold &&
      parsePriceImpact(activeQuote?.quote.priceData?.priceImpact?.amount) >=
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
    if (
      isBatchSell ||
      !activeQuote ||
      (!isSolanaSwap && !isSolanaToNonSolana) ||
      activeQuote.quote.gasIncluded === true
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

    const validationId = ++currentValidationIdRef.current;
    abortController.current?.abort();
    abortController.current = new AbortController();

    try {
      const validationResult = await validateBridgeTx({
        quoteResponse: activeQuote,
        signal: abortController.current?.signal,
      });

      if (validationId !== currentValidationIdRef.current) {
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
      if (validationId !== currentValidationIdRef.current) {
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
  }, [
    activeQuote,
    isBatchSell,
    isSolanaSwap,
    isSolanaToNonSolana,
    validateBridgeTx,
  ]);

  useEffect(() => {
    validateQuote();
  }, [validateQuote]);

  useEffect(() => {
    if (isBatchSell || manuallySelectedQuote) {
      return;
    }

    dispatch(setSelectedQuoteRequestId(undefined));
  }, [dispatch, isBatchSell, manuallySelectedQuote]);

  const isActiveQuoteForCurrentTokenPair =
    isQuoteSourceTokenMatch && isQuoteDestTokenMatch;

  return useMemo(
    () => ({
      recommendedQuote,
      quoteFetchError: isBatchSell
        ? (batchSellQuotes.quoteFetchError ?? null)
        : unifiedQuoteFetchError,
      activeQuote,
      quotesLoadingStatus: isBatchSell
        ? isLoading
          ? RequestStatus.LOADING
          : null
        : quotesLoadingStatus,
      destTokenAmount,
      isLoading,
      formattedQuoteData,
      isNoQuotesAvailable,
      isQuoteGoingToRefresh: willRefresh,
      isExpired,
      blockaidError: isBatchSell ? null : blockaidError,
      shouldShowPriceImpactWarning,
      sortedQuotes,
      needsNewQuote,
      isActiveQuoteForCurrentTokenPair,
    }),
    [
      activeQuote,
      batchSellQuotes.quoteFetchError,
      recommendedQuote,
      blockaidError,
      destTokenAmount,
      formattedQuoteData,
      isActiveQuoteForCurrentTokenPair,
      isBatchSell,
      isExpired,
      isLoading,
      isNoQuotesAvailable,
      needsNewQuote,
      quotesLoadingStatus,
      shouldShowPriceImpactWarning,
      unifiedQuoteFetchError,
      sortedQuotes,
      willRefresh,
    ],
  );
};

export const useBridgeQuotes = ({
  config,
  managedRequest = false,
}: Parameters<typeof useBridgeQuotesRequest>[0]) => {
  const updateQuoteParams = useBridgeQuotesRequest({
    config,
    managedRequest,
  });
  const quoteData = useBridgeQuotesData({ config });

  return useMemo(
    () => ({
      ...quoteData,
      updateQuoteParams,
    }),
    [quoteData, updateQuoteParams],
  );
};
