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
  recommendedQuotes: ReturnType<
    typeof selectBatchSellQuotes
  >['recommendedQuotes'],
  sourceAssetId: CaipAssetType,
  destinationAssetId: CaipAssetType | undefined,
) {
  return recommendedQuotes.find((quote) =>
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
  recommendedQuotes: ReturnType<
    typeof selectBatchSellQuotes
  >['recommendedQuotes'],
) {
  return recommendedQuotes
    .map((quote) => quote?.quoteId ?? quote?.quote.requestId ?? '')
    .join(BATCH_SELL_TRADES_REQUEST_KEY_SEPARATOR);
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
  const batchSellTradesRequestKey = useMemo(
    () => getBatchSellTradesRequestKey(recommendedQuotes),
    [recommendedQuotes],
  );
  const lastBatchSellTradesRequestKey = useRef<string | undefined>(undefined);
  const hasStaleDestinationQuotes = recommendedQuotes.some(
    (quote) =>
      quote && !isQuoteForDestinationAssetId(quote, destinationAssetId),
  );
  const hasQuoteResultsForSelectedTokens =
    sourceTokens.length > 0 &&
    (Boolean(batchSellQuotes.quotesLastFetchedMs) ||
      recommendedQuotes.length === sourceTokens.length);
  const hasAnyQuote = sourceTokens.some((token) => {
    const assetId = formatAddressToAssetId(token.address, token.chainId);

    return Boolean(
      assetId &&
        getRecommendedQuoteBySourceAndDestinationAssetId(
          recommendedQuotes,
          assetId,
          destinationAssetId,
        ),
    );
  });
  const canDisplayAggregatedQuoteData =
    hasAnyQuote && !hasStaleDestinationQuotes;
  const totalNetworkFee = batchSellTrades.totalNetworkFee;

  useEffect(() => {
    if (
      !hasAnyQuote ||
      !hasQuoteResultsForSelectedTokens ||
      hasStaleDestinationQuotes ||
      batchSellQuotes.isLoading
    ) {
      return;
    }

    if (lastBatchSellTradesRequestKey.current === batchSellTradesRequestKey) {
      return;
    }

    lastBatchSellTradesRequestKey.current = batchSellTradesRequestKey;

    Engine.context.BridgeController.updateBatchSellTrades(
      recommendedQuotes,
    ).catch((error) => {
      Logger.error(error, 'Failed to update Batch Sell trades');
    });
  }, [
    batchSellQuotes.isLoading,
    batchSellTradesRequestKey,
    hasAnyQuote,
    hasQuoteResultsForSelectedTokens,
    hasStaleDestinationQuotes,
    recommendedQuotes,
  ]);

  const tokenData = useMemo(
    () =>
      sourceTokens.reduce<BatchSellQuoteTokenDataByAssetId>(
        (tokenDataByAssetId, token) => {
          const assetId = formatAddressToAssetId(token.address, token.chainId);

          if (!assetId) return tokenDataByAssetId;

          const slippage = getBatchSellSlippage(batchSellSlippages, assetId);
          const recommendedQuote =
            getRecommendedQuoteBySourceAndDestinationAssetId(
              recommendedQuotes,
              assetId,
              destinationAssetId,
            );
          const quoteDestinationTokenSymbol =
            recommendedQuote?.quote.destAsset.symbol ?? destinationTokenSymbol;
          const priceImpact = recommendedQuote?.quote.priceData?.priceImpact;
          const parsedPriceImpact = Number(priceImpact);
          const isMissingQuote = !recommendedQuote;

          tokenDataByAssetId[assetId] = {
            key: assetId,
            tokenSymbol: token.symbol,
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
            isQuoteUnavailable:
              isMissingQuote &&
              hasQuoteResultsForSelectedTokens &&
              !batchSellQuotes.isLoading &&
              !hasStaleDestinationQuotes,
          };

          return tokenDataByAssetId;
        },
        {},
      ),
    [
      batchSellSlippages,
      batchSellQuotes.isLoading,
      destinationAssetId,
      destinationTokenSymbol,
      currentCurrency,
      hasQuoteResultsForSelectedTokens,
      hasStaleDestinationQuotes,
      priceImpactWarningThreshold,
      recommendedQuotes,
      sourceTokens,
    ],
  );
  const isLoading =
    batchSellQuotes.isLoading ||
    !hasQuoteResultsForSelectedTokens ||
    hasStaleDestinationQuotes;

  return {
    tokenData,
    totalReceived: formatTokenAmountWithSymbol(
      canDisplayAggregatedQuoteData
        ? batchSellQuotes.totalReceived.amount
        : undefined,
      destinationTokenSymbol,
    ),
    totalReceivedFiat: canDisplayAggregatedQuoteData
      ? formatQuoteDisplayValue({
          amount: batchSellQuotes.totalReceived.amount,
          valueInCurrency: batchSellQuotes.totalReceived.valueInCurrency,
          symbol: destinationTokenSymbol,
          currency: currentCurrency,
        })
      : '-',
    minimumReceived: formatTokenAmountWithSymbol(
      canDisplayAggregatedQuoteData
        ? batchSellQuotes.minimumReceived.amount
        : undefined,
      destinationTokenSymbol,
    ),
    isLoading,
    hasAnyQuote,
    networkFee: formatTokenAmountWithSymbol(
      canDisplayAggregatedQuoteData ? totalNetworkFee?.amount : undefined,
      totalNetworkFee?.asset.symbol,
    ),
    networkFeeFiat: canDisplayAggregatedQuoteData
      ? formatQuoteDisplayValue({
          amount: totalNetworkFee?.amount,
          valueInCurrency: totalNetworkFee?.valueInCurrency,
          symbol: totalNetworkFee?.asset.symbol,
          currency: currentCurrency,
        })
      : '-',
  };
}
