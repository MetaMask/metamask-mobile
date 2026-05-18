import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';
import { CaipAssetType } from '@metamask/utils';
import { formatAddressToAssetId } from '@metamask/bridge-controller';

import {
  selectBatchSellDestToken,
  selectBatchSellQuotes,
  selectBatchSellSlippages,
  selectBatchSellSourceTokens,
  selectBridgeFeatureFlags,
} from '../../../../../core/redux/slices/bridge';
import AppConstants from '../../../../../core/AppConstants';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import formatFiat from '../../../../../util/formatFiat';
import { formatTokenBalance } from '../../utils';
import {
  getBatchSellSlippage,
  getSlippageDisplayValue,
} from '../../components/SlippageModal/utils';

const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';

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

function formatTokenAmountWithSymbol(
  amount: string | undefined,
  symbol: string,
) {
  if (amount === undefined)
    return `${QUOTE_DETAILS_PLACEHOLDER_AMOUNT} ${symbol}`;

  return `${formatTokenBalance(amount)} ${symbol}`;
}

function formatFiatValue(
  valueInCurrency: string | null | undefined,
  currency: string,
) {
  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), currency);
}

function getRecommendedQuoteBySourceAssetId(
  recommendedQuotes: ReturnType<
    typeof selectBatchSellQuotes
  >['recommendedQuotes'],
  sourceAssetId: CaipAssetType,
) {
  return recommendedQuotes.find((quote) =>
    Boolean(
      quote &&
        formatAddressToAssetId(
          quote.quote.srcAsset.address,
          quote.quote.srcChainId,
        ) === sourceAssetId,
    ),
  );
}

export function useBatchSellQuoteData() {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const batchSellQuotes = useSelector(selectBatchSellQuotes);
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const priceImpactWarningThreshold =
    bridgeFeatureFlags?.priceImpactThreshold?.warning ??
    AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD;

  const destinationTokenSymbol =
    selectedDestinationToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL;
  const recommendedQuotes = useMemo(
    () => batchSellQuotes.recommendedQuotes ?? [],
    [batchSellQuotes.recommendedQuotes],
  );
  const hasQuoteResultsForSelectedTokens =
    sourceTokens.length > 0 &&
    (Boolean(batchSellQuotes.quotesLastFetchedMs) ||
      recommendedQuotes.length === sourceTokens.length);
  const tokenData = useMemo(
    () =>
      sourceTokens.reduce<BatchSellQuoteTokenDataByAssetId>(
        (tokenDataByAssetId, token) => {
          const assetId = formatAddressToAssetId(token.address, token.chainId);

          if (!assetId) return tokenDataByAssetId;

          const slippage = getBatchSellSlippage(batchSellSlippages, assetId);
          const recommendedQuote = getRecommendedQuoteBySourceAssetId(
            recommendedQuotes,
            assetId,
          );
          const priceImpact = recommendedQuote?.quote.priceData?.priceImpact;
          const parsedPriceImpact = Number(priceImpact);
          const isMissingQuote = !recommendedQuote;

          tokenDataByAssetId[assetId] = {
            key: assetId,
            tokenSymbol: token.symbol,
            slippage: getSlippageDisplayValue(slippage),
            receivedAmount: formatTokenAmountWithSymbol(
              recommendedQuote?.toTokenAmount.amount,
              destinationTokenSymbol,
            ),
            receivedAmountFiat: formatFiatValue(
              recommendedQuote?.toTokenAmount.valueInCurrency,
              currentCurrency,
            ),
            priceImpact,
            isHighPriceImpact:
              priceImpact !== undefined &&
              Number.isFinite(parsedPriceImpact) &&
              parsedPriceImpact >= priceImpactWarningThreshold,
            isQuoteUnavailable:
              isMissingQuote &&
              hasQuoteResultsForSelectedTokens &&
              !batchSellQuotes.isLoading,
          };

          return tokenDataByAssetId;
        },
        {},
      ),
    [
      batchSellSlippages,
      batchSellQuotes.isLoading,
      destinationTokenSymbol,
      currentCurrency,
      hasQuoteResultsForSelectedTokens,
      priceImpactWarningThreshold,
      recommendedQuotes,
      sourceTokens,
    ],
  );
  const tokenDataValues = Object.values(tokenData);
  const hasAnyQuote = recommendedQuotes.some(Boolean);
  const hasCompleteQuoteSet =
    !batchSellQuotes.isLoading &&
    hasQuoteResultsForSelectedTokens &&
    tokenDataValues.every(({ isQuoteUnavailable }) => !isQuoteUnavailable);
  const isLoading =
    batchSellQuotes.isLoading || !hasQuoteResultsForSelectedTokens;

  return {
    tokenData,
    totalReceived: formatTokenAmountWithSymbol(
      hasAnyQuote ? batchSellQuotes.totalReceived.amount : undefined,
      destinationTokenSymbol,
    ),
    totalReceivedFiat: hasAnyQuote
      ? formatFiatValue(
          batchSellQuotes.totalReceived.valueInCurrency,
          currentCurrency,
        )
      : '-',
    minimumReceived: formatTokenAmountWithSymbol(
      hasAnyQuote ? batchSellQuotes.minimumReceived.amount : undefined,
      destinationTokenSymbol,
    ),
    isLoading,
    hasAnyQuote,
    hasCompleteQuoteSet,
    networkFee: formatTokenAmountWithSymbol(
      hasAnyQuote ? batchSellQuotes.totalNetworkFee.amount : undefined,
      destinationTokenSymbol,
    ),
    networkFeeFiat: hasAnyQuote
      ? formatFiatValue(
          batchSellQuotes.totalNetworkFee.valueInCurrency,
          currentCurrency,
        )
      : '-',
  };
}
