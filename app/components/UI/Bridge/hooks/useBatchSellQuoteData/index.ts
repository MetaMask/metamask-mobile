import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../reducers';
import BigNumber from 'bignumber.js';
import { CaipAssetType } from '@metamask/utils';
import {
  formatAddressToAssetId,
  isNativeAddress,
} from '@metamask/bridge-controller';

import {
  selectBatchSellDestToken,
  selectBatchSellQuotes,
  selectBatchSellSlippages,
  selectBatchSellSourceTokenAmounts,
  selectBatchSellSourceTokens,
  selectBatchSellTrades,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import AppConstants from '../../../../../core/AppConstants';
import Engine from '../../../../../core/Engine';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import formatFiat from '../../../../../util/formatFiat';
import Logger from '../../../../../util/Logger';
import { formatTokenBalance } from '../../utils';
import {
  getBatchSellSlippage,
  getSlippageDisplayValue,
} from '../../components/SlippageModal/utils';
import type { BridgeToken } from '../../types';
import { hasValidBatchSellSourceAmounts } from '../useBatchSellQuoteRequest';
import { getQuoteRefreshRate, isQuoteExpired } from '../../utils/quoteUtils';
import { getMaybeHexChainId } from '../../../../../util/bridge';

const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';
const BATCH_SELL_TRADES_REQUEST_KEY_SEPARATOR = '|';

type BatchSellRecommendedQuote = NonNullable<
  ReturnType<typeof selectBatchSellQuotes>['recommendedQuotes'][number]
>;

export interface BatchSellQuoteTokenData {
  key: string;
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  receivedAmountFiat: string;
  priceImpact?: string;
  quote: BatchSellRecommendedQuote | null;
  isLoading: boolean;
  isHighPriceImpact: boolean;
  isQuoteUnavailable: boolean;
}

export type BatchSellQuoteTokenDataByAssetId = Record<
  CaipAssetType,
  BatchSellQuoteTokenData
>;
type BatchSellRecommendedQuotes = ReturnType<
  typeof selectBatchSellQuotes
>['recommendedQuotes'];
type BatchSellQuoteAmountKey = 'toTokenAmount' | 'minToTokenAmount';

interface BatchSellQuoteRow {
  assetId: CaipAssetType;
  recommendedQuote: BatchSellRecommendedQuote | undefined;
  tokenSymbol: string;
}

interface UseBatchSellQuoteDataOptions {
  shouldUpdateBatchSellTrades?: boolean;
}

export function getBatchSellOrderedQuoteTokenData(
  sourceTokens: BridgeToken[],
  tokenData: BatchSellQuoteTokenDataByAssetId,
) {
  return sourceTokens.reduce<BatchSellQuoteTokenData[]>(
    (quoteTokenData, token) => {
      const assetId = formatAddressToAssetId(token.address, token.chainId);
      const tokenQuoteData = assetId ? tokenData[assetId] : undefined;

      if (tokenQuoteData) quoteTokenData.push(tokenQuoteData);

      return quoteTokenData;
    },
    [],
  );
}

function formatTokenAmountWithSymbol(
  amount: string | undefined,
  symbol: string | undefined,
) {
  const tokenSymbol = symbol ? ` ${symbol}` : '';

  if (amount === undefined)
    return `${QUOTE_DETAILS_PLACEHOLDER_AMOUNT}${tokenSymbol}`;

  return `${formatTokenBalance(amount)}${tokenSymbol}`;
}

function formatQuoteDisplayValue({
  amount,
  valueInCurrency,
  symbol,
  currency,
}: {
  amount: string | undefined;
  valueInCurrency: string | null | undefined;
  symbol: string | undefined;
  currency: string;
}) {
  const hasTokenAmount = amount !== undefined;
  const hasNonZeroTokenAmount = hasTokenAmount && new BigNumber(amount).gt(0);
  const hasMissingDisplayValue =
    !valueInCurrency ||
    (new BigNumber(valueInCurrency).isZero() && hasNonZeroTokenAmount);

  if (hasMissingDisplayValue && hasTokenAmount) {
    return formatTokenAmountWithSymbol(amount, symbol);
  }

  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), currency);
}

function formatCurrencyDisplayValue(
  valueInCurrency: string | null | undefined,
  currency: string,
) {
  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), currency);
}

function isQuoteForDestinationAssetId(
  quote: BatchSellRecommendedQuote,
  destinationAssetId: CaipAssetType | undefined,
) {
  return (
    destinationAssetId !== undefined &&
    formatAddressToAssetId(
      quote.quote.destAsset.address,
      quote.quote.destChainId,
    ) === destinationAssetId
  );
}

function getRecommendedQuoteBySourceAndDestinationAssetId(
  recommendedQuotes: BatchSellRecommendedQuotes,
  sourceAssetId: CaipAssetType,
  destinationAssetId: CaipAssetType | undefined,
) {
  return recommendedQuotes.find((quote): quote is BatchSellRecommendedQuote =>
    Boolean(
      quote &&
        formatAddressToAssetId(
          quote.quote.srcAsset.address,
          quote.quote.srcChainId,
        ) === sourceAssetId &&
        isQuoteForDestinationAssetId(quote, destinationAssetId),
    ),
  );
}

function getBatchSellTradesRequestKey(
  recommendedQuotes: BatchSellRecommendedQuotes,
) {
  return recommendedQuotes
    .map((quote) => quote?.quoteId ?? quote?.quote.requestId ?? '')
    .join(BATCH_SELL_TRADES_REQUEST_KEY_SEPARATOR);
}

function sumRecommendedQuoteAmounts(
  recommendedQuotes: BatchSellRecommendedQuote[],
  amountKey: BatchSellQuoteAmountKey,
) {
  return recommendedQuotes.reduce(
    (total, quote) => ({
      amount: new BigNumber(total.amount)
        .plus(quote[amountKey]?.amount ?? 0)
        .toString(),
      valueInCurrency:
        total.valueInCurrency || quote[amountKey]?.valueInCurrency
          ? new BigNumber(total.valueInCurrency ?? 0)
              .plus(quote[amountKey]?.valueInCurrency ?? 0)
              .toString()
          : null,
    }),
    { amount: '0', valueInCurrency: null as string | null },
  );
}

function getBatchSellMetamaskFeePercent(
  recommendedQuotes: BatchSellRecommendedQuote[],
) {
  const quoteBpsFee = recommendedQuotes
    .map((recommendedQuote) => {
      const fee = recommendedQuote.quote.feeData?.metabridge?.quoteBpsFee;

      return fee as number | string | null | undefined;
    })
    .find((fee): fee is number | string => fee !== undefined && fee !== null);
  const parsedQuoteBpsFee =
    quoteBpsFee === undefined ? undefined : new BigNumber(quoteBpsFee);

  if (!parsedQuoteBpsFee?.isFinite() || parsedQuoteBpsFee.lte(0))
    return undefined;

  return parsedQuoteBpsFee.div(100).toString();
}

export function useBatchSellQuoteData({
  shouldUpdateBatchSellTrades = true,
}: UseBatchSellQuoteDataOptions = {}) {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const batchSellSourceTokenAmounts = useSelector(
    selectBatchSellSourceTokenAmounts,
  );
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const batchSellQuotes = useSelector(selectBatchSellQuotes);
  const batchSellTrades = useSelector(selectBatchSellTrades);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const batchSellChainId = getMaybeHexChainId(sourceTokens[0]?.chainId);
  const isSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, batchSellChainId),
  );
  const priceImpactWarningThreshold =
    bridgeFeatureFlags?.priceImpactThreshold?.warning ??
    AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD;
  const refreshRate = getQuoteRefreshRate(bridgeFeatureFlags, sourceTokens[0]);

  const destinationTokenSymbol =
    selectedDestinationToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL;
  const destinationAssetId = selectedDestinationToken
    ? formatAddressToAssetId(
        selectedDestinationToken.address,
        selectedDestinationToken.chainId,
      )
    : undefined;
  const recommendedQuotes = useMemo(
    () => batchSellQuotes.recommendedQuotes ?? [],
    [batchSellQuotes.recommendedQuotes],
  );
  const recommendedQuotesRequestKey = useMemo(
    () => getBatchSellTradesRequestKey(recommendedQuotes),
    [recommendedQuotes],
  );
  const lastFetchedRecommendedQuotesRequestKey = useRef<string | undefined>(
    undefined,
  );
  const lastBatchSellTradesRequestKey = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!batchSellQuotes.isLoading) {
      lastFetchedRecommendedQuotesRequestKey.current =
        recommendedQuotesRequestKey;
    }
  }, [batchSellQuotes.isLoading, recommendedQuotesRequestKey]);

  const hasValidSourceAmounts = useMemo(
    () =>
      hasValidBatchSellSourceAmounts(
        sourceTokens,
        batchSellSourceTokenAmounts,
        selectedDestinationToken,
      ),
    [batchSellSourceTokenAmounts, selectedDestinationToken, sourceTokens],
  );
  const shouldHideStaleRefreshQuotes = Boolean(
    batchSellQuotes.isLoading &&
      lastFetchedRecommendedQuotesRequestKey.current &&
      lastFetchedRecommendedQuotesRequestKey.current ===
        recommendedQuotesRequestKey,
  );
  const activeRecommendedQuotes = useMemo(() => {
    if (!hasValidSourceAmounts || shouldHideStaleRefreshQuotes) {
      return [];
    }

    return recommendedQuotes;
  }, [hasValidSourceAmounts, recommendedQuotes, shouldHideStaleRefreshQuotes]);
  const hasStaleDestinationQuotes = recommendedQuotes.some(
    (quote) =>
      quote && !isQuoteForDestinationAssetId(quote, destinationAssetId),
  );
  const hasQuoteResultsForSelectedTokens =
    sourceTokens.length > 0 &&
    (Boolean(batchSellQuotes.quotesLastFetchedMs) ||
      activeRecommendedQuotes.length === sourceTokens.length);
  const quoteRows = useMemo(
    () =>
      sourceTokens.reduce<BatchSellQuoteRow[]>((rows, token) => {
        const assetId = formatAddressToAssetId(token.address, token.chainId);

        if (!assetId) return rows;

        rows.push({
          assetId,
          recommendedQuote: getRecommendedQuoteBySourceAndDestinationAssetId(
            activeRecommendedQuotes,
            assetId,
            destinationAssetId,
          ),
          tokenSymbol: token.symbol,
        });

        return rows;
      }, []),
    [activeRecommendedQuotes, destinationAssetId, sourceTokens],
  );
  const availableRecommendedQuotes = useMemo(
    () =>
      quoteRows
        .map(({ recommendedQuote }) => recommendedQuote)
        .filter((quote): quote is BatchSellRecommendedQuote => Boolean(quote)),
    [quoteRows],
  );
  const hasAnyQuote = availableRecommendedQuotes.length > 0;
  const totalNetworkFee = batchSellTrades.totalNetworkFee;
  const isBatchSellTradesLoading = Boolean(batchSellTrades.isLoading);
  const isNetworkFeeUnavailable = !isBatchSellTradesLoading && !totalNetworkFee;

  // Quote-level gasless params are not reliable for Batch Sell because gasless
  // behavior is only simulated when the controller calls obtainGaslessBatch.
  // Clients do not consume that API response directly; selectBatchSellTrades
  // exposes the controller-interpreted result, so derive gasless state from it.
  const isGasless =
    hasAnyQuote &&
    Boolean(
      totalNetworkFee?.asset && !isNativeAddress(totalNetworkFee.asset.address),
    );
  const isWaitingForQuoteRows =
    hasValidSourceAmounts &&
    (!hasQuoteResultsForSelectedTokens ||
      batchSellQuotes.isLoading ||
      hasStaleDestinationQuotes);
  const hasPendingQuoteRows = quoteRows.some(
    ({ recommendedQuote }) => !recommendedQuote && isWaitingForQuoteRows,
  );
  const canDisplayAggregatedQuoteData =
    hasAnyQuote && !hasStaleDestinationQuotes;
  const needsNewQuote =
    canDisplayAggregatedQuoteData &&
    !batchSellQuotes.isLoading &&
    isQuoteExpired(
      batchSellQuotes.isQuoteGoingToRefresh,
      refreshRate,
      batchSellQuotes.quotesLastFetchedMs ?? null,
    );
  const isLoading =
    hasValidSourceAmounts &&
    (batchSellQuotes.isLoading ||
      !hasQuoteResultsForSelectedTokens ||
      hasStaleDestinationQuotes);
  const isSummaryLoading =
    hasValidSourceAmounts &&
    (!hasAnyQuote || hasStaleDestinationQuotes) &&
    isLoading;
  const totalReceived = useMemo(
    () =>
      sumRecommendedQuoteAmounts(availableRecommendedQuotes, 'toTokenAmount'),
    [availableRecommendedQuotes],
  );
  const minimumReceived = useMemo(
    () =>
      sumRecommendedQuoteAmounts(
        availableRecommendedQuotes,
        'minToTokenAmount',
      ),
    [availableRecommendedQuotes],
  );
  const batchSellTradesRequestKey = useMemo(
    () => getBatchSellTradesRequestKey(availableRecommendedQuotes),
    [availableRecommendedQuotes],
  );
  const totalReceivedAmount = canDisplayAggregatedQuoteData
    ? totalReceived.amount
    : undefined;
  const totalReceivedValueInCurrency = canDisplayAggregatedQuoteData
    ? totalReceived.valueInCurrency
    : undefined;
  const minimumReceivedAmount = canDisplayAggregatedQuoteData
    ? minimumReceived.amount
    : undefined;
  const totalNetworkFeeAmount = canDisplayAggregatedQuoteData
    ? totalNetworkFee?.amount
    : undefined;
  const totalNetworkFeeUsd = canDisplayAggregatedQuoteData
    ? totalNetworkFee?.usd
    : undefined;
  const totalNetworkFeeValueInCurrency = canDisplayAggregatedQuoteData
    ? totalNetworkFee?.valueInCurrency
    : undefined;
  const totalReceivedData = {
    amount: totalReceivedAmount,
    valueInCurrency: totalReceivedValueInCurrency,
    formatted: formatTokenAmountWithSymbol(
      totalReceivedAmount,
      destinationTokenSymbol,
    ),
    formattedFiat: canDisplayAggregatedQuoteData
      ? formatQuoteDisplayValue({
          amount: totalReceivedAmount,
          valueInCurrency: totalReceivedValueInCurrency,
          symbol: destinationTokenSymbol,
          currency: currentCurrency,
        })
      : '-',
  };
  const minimumReceivedData = {
    amount: minimumReceivedAmount,
    valueInCurrency: canDisplayAggregatedQuoteData
      ? minimumReceived.valueInCurrency
      : undefined,
    formatted: formatTokenAmountWithSymbol(
      minimumReceivedAmount,
      destinationTokenSymbol,
    ),
  };
  const networkFeeData = {
    amount: totalNetworkFeeAmount,
    usd: totalNetworkFeeUsd,
    valueInCurrency: totalNetworkFeeValueInCurrency,
    asset: totalNetworkFee?.asset,
    formatted: formatTokenAmountWithSymbol(
      totalNetworkFeeAmount,
      totalNetworkFee?.asset.symbol,
    ),
    formattedFiat: canDisplayAggregatedQuoteData
      ? formatCurrencyDisplayValue(
          totalNetworkFeeValueInCurrency,
          currentCurrency,
        )
      : '-',
  };
  const quotePercentFee = useMemo(
    () => getBatchSellMetamaskFeePercent(availableRecommendedQuotes),
    [availableRecommendedQuotes],
  );

  useEffect(() => {
    if (
      !shouldUpdateBatchSellTrades ||
      !hasAnyQuote ||
      hasPendingQuoteRows ||
      hasStaleDestinationQuotes
    ) {
      return;
    }

    if (lastBatchSellTradesRequestKey.current === batchSellTradesRequestKey) {
      return;
    }

    lastBatchSellTradesRequestKey.current = batchSellTradesRequestKey;

    Engine.context.BridgeController.updateBatchSellTrades(
      availableRecommendedQuotes,
      isSmartTransaction,
    ).catch((error) => {
      Logger.error(error, 'Failed to update Batch Sell trades');
    });
  }, [
    availableRecommendedQuotes,
    batchSellTradesRequestKey,
    hasAnyQuote,
    hasPendingQuoteRows,
    hasStaleDestinationQuotes,
    isSmartTransaction,
    shouldUpdateBatchSellTrades,
  ]);

  const tokenData = useMemo(
    () =>
      quoteRows.reduce<BatchSellQuoteTokenDataByAssetId>(
        (tokenDataByAssetId, { assetId, recommendedQuote, tokenSymbol }) => {
          const slippage = getBatchSellSlippage(batchSellSlippages, assetId);
          const quoteDestinationTokenSymbol =
            recommendedQuote?.quote.destAsset.symbol ?? destinationTokenSymbol;
          const priceImpact = recommendedQuote?.quote.priceData?.priceImpact;
          const parsedPriceImpact = Number(priceImpact);
          const isMissingQuote = !recommendedQuote;

          tokenDataByAssetId[assetId] = {
            key: assetId,
            tokenSymbol,
            slippage: getSlippageDisplayValue(slippage),
            receivedAmount: formatTokenAmountWithSymbol(
              recommendedQuote?.toTokenAmount.amount,
              quoteDestinationTokenSymbol,
            ),
            receivedAmountFiat: formatQuoteDisplayValue({
              amount: recommendedQuote?.toTokenAmount.amount,
              valueInCurrency: recommendedQuote?.toTokenAmount.valueInCurrency,
              symbol: quoteDestinationTokenSymbol,
              currency: currentCurrency,
            }),
            priceImpact,
            quote: recommendedQuote ?? null,
            isHighPriceImpact:
              priceImpact !== undefined &&
              Number.isFinite(parsedPriceImpact) &&
              parsedPriceImpact >= priceImpactWarningThreshold,
            isLoading: isMissingQuote && isWaitingForQuoteRows,
            isQuoteUnavailable: isMissingQuote && !isWaitingForQuoteRows,
          };

          return tokenDataByAssetId;
        },
        {},
      ),
    [
      batchSellSlippages,
      destinationTokenSymbol,
      currentCurrency,
      isWaitingForQuoteRows,
      priceImpactWarningThreshold,
      quoteRows,
    ],
  );

  return {
    tokenData,
    totalReceived: totalReceivedData,
    minimumReceived: minimumReceivedData,
    isLoading,
    isSummaryLoading,
    isGasless,
    isBatchSellTradeAvailable: batchSellTrades.isBatchSellTradeAvailable,
    isBatchSellTradesLoading,
    isNetworkFeeUnavailable,
    hasAnyQuote,
    hasPendingQuoteRows,
    needsNewQuote,
    networkFee: networkFeeData,
    quotePercentFee,
    recommendedQuotes: availableRecommendedQuotes,
  };
}
