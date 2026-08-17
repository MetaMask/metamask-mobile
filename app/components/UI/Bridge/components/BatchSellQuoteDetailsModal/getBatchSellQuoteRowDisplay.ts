import { formatAddressToAssetId } from '@metamask/bridge-controller';
import BigNumber from 'bignumber.js';
import type { CaipAssetType } from '@metamask/utils';

import formatFiat from '../../../../../util/formatFiat';
import { formatTokenBalance } from '../../utils';
import {
  getBatchSellSlippage,
  getSlippageDisplayValue,
} from '../SlippageModal/utils';
import type { BridgeToken } from '../../types';
import { useBatchSellQuotes } from '../../hooks/useBatchSellQuotes';
import { useBridgeQuotes } from '../../hooks/useBridgeQuotes';

const formatTokenAmountWithSymbol = (
  amount: string | undefined,
  symbol: string | undefined,
) => {
  const tokenSymbol = symbol ? ` ${symbol}` : '';

  if (amount === undefined) return `--${tokenSymbol}`;

  return `${formatTokenBalance(amount)}${tokenSymbol}`;
};

const formatQuoteDisplayValue = ({
  amount,
  valueInCurrency,
  symbol,
  currency,
}: {
  amount: string | undefined;
  valueInCurrency: string | null | undefined;
  symbol: string | undefined;
  currency: string;
}) => {
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
};

export const getVisibleBatchSellQuote = (
  row: ReturnType<typeof useBridgeQuotes> | undefined,
  hasAnyQuote: boolean,
) =>
  hasAnyQuote && row?.recommendedQuote && row.isActiveQuoteForCurrentTokenPair
    ? row.recommendedQuote
    : null;

export const getBatchSellQuoteRowDisplay = ({
  token,
  quotes,
  slippages,
  currency,
}: {
  token: BridgeToken;
  quotes: ReturnType<typeof useBatchSellQuotes>;
  slippages: Partial<Record<CaipAssetType, string | undefined>>;
  currency: string;
}) => {
  const assetId = formatAddressToAssetId(token.address, token.chainId);
  if (!assetId) return undefined;

  const row = quotes.quotesByAssetId[assetId];
  const visibleQuote = getVisibleBatchSellQuote(row, quotes.hasAnyQuote);
  const isWaiting =
    quotes.isLoading || quotes.isSummaryLoading || quotes.hasPendingQuoteRows;
  const destAmount = visibleQuote?.quote.dest.normalizedAmount;
  const destValue = visibleQuote?.quote.dest.valueInCurrency;
  const quoteDestSymbol = visibleQuote?.quote.dest.asset.symbol;

  return {
    key: assetId,
    tokenSymbol: token.symbol,
    slippage: getSlippageDisplayValue(getBatchSellSlippage(slippages, assetId)),
    quote: visibleQuote,
    receivedAmount: formatTokenAmountWithSymbol(destAmount, quoteDestSymbol),
    receivedAmountFiat: visibleQuote
      ? formatQuoteDisplayValue({
          amount: destAmount,
          valueInCurrency: destValue,
          symbol: quoteDestSymbol,
          currency,
        })
      : '-',
    priceImpact: visibleQuote?.quote.priceData?.priceImpact?.amount,
    isLoading: !visibleQuote && isWaiting,
    isHighPriceImpact: visibleQuote
      ? (row?.shouldShowPriceImpactWarning ?? false)
      : false,
    isQuoteUnavailable: !visibleQuote && !isWaiting,
  };
};

export const getBatchSellQuoteDetailsRows = ({
  sourceTokens,
  quotes,
  slippages,
  currency,
}: {
  sourceTokens: BridgeToken[];
  quotes: ReturnType<typeof useBatchSellQuotes>;
  slippages: Partial<Record<CaipAssetType, string | undefined>>;
  currency: string;
}) =>
  sourceTokens.flatMap((token) => {
    const row = getBatchSellQuoteRowDisplay({
      token,
      quotes,
      slippages,
      currency,
    });
    return row ? [row] : [];
  });
