import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import BigNumber from 'bignumber.js';

import {
  selectBatchSellDestToken,
  selectBatchSellQuotes,
  selectBatchSellSlippages,
  selectBatchSellSourceTokens,
} from '../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import formatFiat from '../../../../../util/formatFiat';
import { getBridgeTokenAssetId } from '../../utils/tokenUtils';
import { formatTokenBalance } from '../../utils';
import {
  DEFAULT_BATCH_SELL_SLIPPAGE,
  getBatchSellSlippage,
  getSlippageDisplayValue,
} from '../../components/SlippageModal/utils';

const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';

interface BatchSellQuoteTokenData {
  key: string;
  tokenSymbol: string;
  slippage: string;
  receivedAmount: string;
  receivedAmountFiat: string;
  isLoading: boolean;
}

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

export function useBatchSellQuoteData() {
  const sourceTokens = useSelector(selectBatchSellSourceTokens);
  const selectedDestinationToken = useSelector(selectBatchSellDestToken);
  const batchSellSlippages = useSelector(selectBatchSellSlippages);
  const batchSellQuotes = useSelector(selectBatchSellQuotes);
  const currentCurrency = useSelector(selectCurrentCurrency);

  const destinationTokenSymbol =
    selectedDestinationToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL;
  const recommendedQuotes = useMemo(
    () => batchSellQuotes.recommendedQuotes ?? [],
    [batchSellQuotes.recommendedQuotes],
  );
  const tokenData = useMemo(
    () =>
      sourceTokens.map<BatchSellQuoteTokenData>((token, index) => {
        const assetId = getBridgeTokenAssetId(token);
        const slippage = assetId
          ? getBatchSellSlippage(batchSellSlippages, assetId)
          : DEFAULT_BATCH_SELL_SLIPPAGE;
        const recommendedQuote = recommendedQuotes[index] ?? undefined;

        return {
          key: assetId ?? `${token.chainId}:${token.address}`,
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
          isLoading: !recommendedQuote,
        };
      }),
    [
      batchSellSlippages,
      destinationTokenSymbol,
      currentCurrency,
      recommendedQuotes,
      sourceTokens,
    ],
  );
  const hasExpectedQuotes = recommendedQuotes.length > 0;
  const hasCompleteQuoteSet =
    hasExpectedQuotes && tokenData.every(({ isLoading }) => !isLoading);
  const isLoading = batchSellQuotes.isLoading || !hasCompleteQuoteSet;

  return {
    tokenData,
    totalReceived: formatTokenAmountWithSymbol(
      hasCompleteQuoteSet ? batchSellQuotes.totalReceived.amount : undefined,
      destinationTokenSymbol,
    ),
    totalReceivedFiat: hasCompleteQuoteSet
      ? formatFiatValue(
          batchSellQuotes.totalReceived.valueInCurrency,
          currentCurrency,
        )
      : '-',
    minimumReceived: formatTokenAmountWithSymbol(
      hasCompleteQuoteSet ? batchSellQuotes.minimumReceived.amount : undefined,
      destinationTokenSymbol,
    ),
    isLoading,
    hasCompleteQuoteSet,
    networkFee: formatTokenAmountWithSymbol(
      hasCompleteQuoteSet ? batchSellQuotes.totalNetworkFee.amount : undefined,
      destinationTokenSymbol,
    ),
    networkFeeFiat: hasCompleteQuoteSet
      ? formatFiatValue(
          batchSellQuotes.totalNetworkFee.valueInCurrency,
          currentCurrency,
        )
      : '-',
  };
}
