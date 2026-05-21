import { useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { CaipAssetType } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';

import {
  selectBatchSellDestToken,
  selectBatchSellQuotes,
  selectBatchSellSlippages,
  selectBatchSellSourceTokens,
  selectBatchSellTrades,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import AppConstants from '../../../../../core/AppConstants';
import Engine from '../../../../../core/Engine';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import formatFiat from '../../../../../util/formatFiat';
import Logger from '../../../../../util/Logger';
import { formatTokenBalance } from '../../utils';
import {
  getBatchSellSlippage,
  getSlippageDisplayValue,
} from '../../components/SlippageModal/utils';

const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';
const BATCH_SELL_TRADES_REQUEST_KEY_SEPARATOR = '|';

export interface BatchSellQuoteTokenData {
  key: string;
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  receivedAmountFiat: string;
  priceImpact?: string;
  isLoading: boolean;
  isHighPriceImpact: boolean;
  isQuoteUnavailable: boolean;
}

type BatchSellQuoteTokenDataByAssetId = Record<
  CaipAssetType,
  BatchSellQuoteTokenData
>;
type BatchSellRecommendedQuote = NonNullable<
  ReturnType<typeof selectBatchSellQuotes>['recommendedQuotes'][number]
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

export function useBatchSellQuoteData() {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const batchSellQuotes = useSelector(selectBatchSellQuotes);
  const batchSellTrades = useSelector(selectBatchSellTrades);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const priceImpactWarningThreshold =
    bridgeFeatureFlags?.priceImpactThreshold?.warning ??
    AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD;

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

  const shouldHideStaleRefreshQuotes = Boolean(
    batchSellQuotes.isLoading &&
      lastFetchedRecommendedQuotesRequestKey.current &&
      lastFetchedRecommendedQuotesRequestKey.current ===
        recommendedQuotesRequestKey,
  );
  const visibleRecommendedQuotes = useMemo(
    () => (shouldHideStaleRefreshQuotes ? [] : recommendedQuotes),
    [recommendedQuotes, shouldHideStaleRefreshQuotes],
  );
  const hasStaleDestinationQuotes = recommendedQuotes.some(
    (quote) =>
      quote && !isQuoteForDestinationAssetId(quote, destinationAssetId),
  );
  const hasQuoteResultsForSelectedTokens =
    sourceTokens.length > 0 &&
    (Boolean(batchSellQuotes.quotesLastFetchedMs) ||
      visibleRecommendedQuotes.length === sourceTokens.length);
  const quoteRows = useMemo(
    () =>
      sourceTokens.reduce<BatchSellQuoteRow[]>((rows, token) => {
        const assetId = formatAddressToAssetId(token.address, token.chainId);

        if (!assetId) return rows;

        rows.push({
          assetId,
          recommendedQuote: getRecommendedQuoteBySourceAndDestinationAssetId(
            visibleRecommendedQuotes,
            assetId,
            destinationAssetId,
          ),
          tokenSymbol: token.symbol,
        });

        return rows;
      }, []),
    [destinationAssetId, sourceTokens, visibleRecommendedQuotes],
  );
  const availableRecommendedQuotes = useMemo(
    () =>
      quoteRows
        .map(({ recommendedQuote }) => recommendedQuote)
        .filter((quote): quote is BatchSellRecommendedQuote => Boolean(quote)),
    [quoteRows],
  );
  const hasAnyQuote = availableRecommendedQuotes.length > 0;
  const isWaitingForQuoteRows =
    !hasQuoteResultsForSelectedTokens ||
    batchSellQuotes.isLoading ||
    hasStaleDestinationQuotes;
  const hasPendingQuoteRows = quoteRows.some(
    ({ recommendedQuote }) => !recommendedQuote && isWaitingForQuoteRows,
  );
  const canDisplayAggregatedQuoteData =
    hasAnyQuote && !hasStaleDestinationQuotes;
  const isLoading =
    batchSellQuotes.isLoading ||
    !hasQuoteResultsForSelectedTokens ||
    hasStaleDestinationQuotes;
  const isSummaryLoading =
    (!hasAnyQuote || hasStaleDestinationQuotes) && isLoading;
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
  const totalNetworkFee = batchSellTrades.totalNetworkFee;
  const networkFeeIsLoading = !batchSellTrades.isBatchSellTradeAvailable;

  useEffect(() => {
    if (!hasAnyQuote || hasPendingQuoteRows || hasStaleDestinationQuotes) {
      return;
    }

    if (lastBatchSellTradesRequestKey.current === batchSellTradesRequestKey) {
      return;
    }

    lastBatchSellTradesRequestKey.current = batchSellTradesRequestKey;

    Engine.context.BridgeController.updateBatchSellTrades(
      availableRecommendedQuotes,
    ).catch((error) => {
      Logger.error(error, 'Failed to update Batch Sell trades');
    });
  }, [
    availableRecommendedQuotes,
    batchSellTradesRequestKey,
    hasAnyQuote,
    hasPendingQuoteRows,
    hasStaleDestinationQuotes,
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
    totalReceived: formatTokenAmountWithSymbol(
      canDisplayAggregatedQuoteData ? totalReceived.amount : undefined,
      destinationTokenSymbol,
    ),
    totalReceivedFiat: canDisplayAggregatedQuoteData
      ? formatQuoteDisplayValue({
          amount: totalReceived.amount,
          valueInCurrency: totalReceived.valueInCurrency,
          symbol: destinationTokenSymbol,
          currency: currentCurrency,
        })
      : '-',
    minimumReceived: formatTokenAmountWithSymbol(
      canDisplayAggregatedQuoteData ? minimumReceived.amount : undefined,
      destinationTokenSymbol,
    ),
    isLoading,
    isSummaryLoading,
    hasAnyQuote,
    hasPendingQuoteRows,
    networkFeeIsLoading,
    networkFee: formatTokenAmountWithSymbol(
      canDisplayAggregatedQuoteData ? totalNetworkFee?.amount : undefined,
      totalNetworkFee?.asset.symbol,
    ),
    networkFeeFiat: canDisplayAggregatedQuoteData
      ? formatCurrencyDisplayValue(
          totalNetworkFee?.valueInCurrency,
          currentCurrency,
        )
      : '-',
  };
}
