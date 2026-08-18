import type { QuoteResponse } from '@metamask/bridge-controller';
import BigNumber from 'bignumber.js';

import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import formatFiat from '../../../../util/formatFiat';
import { formatCurrency } from '../utils/currencyUtils';
import { formatNetworkFee } from '../utils/formatNetworkFee';
import { formatTokenBalance } from '../utils';
import type { BridgeToken } from '../types';

const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';

const formatSlippageForQuoteDisplay = (slippage?: string) => {
  const slippageNumber = slippage ? Number(slippage) : undefined;
  return slippageNumber === undefined || Number.isNaN(slippageNumber)
    ? 'Auto'
    : `${slippageNumber}%`;
};

export const formatTokenAmountWithSymbol = (
  amount: string | undefined,
  symbol: string | undefined,
) => {
  const tokenSymbol = symbol ? ` ${symbol}` : '';

  if (amount === undefined) {
    return `${QUOTE_DETAILS_PLACEHOLDER_AMOUNT}${tokenSymbol}`;
  }

  return `${formatTokenBalance(amount)}${tokenSymbol}`;
};

export function formatCurrencyDisplayValue(
  valueInCurrency: string | null | undefined,
  currency: string,
) {
  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), currency);
}

export const formatQuoteDisplayValue = ({
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

  return formatCurrencyDisplayValue(valueInCurrency, currency);
};

/**
 * Formats a quote for display: rate, fee, time, slippage, price impact, and
 * received amounts. Missing quote or amount values use `--` / `-` placeholders.
 *
 * @param quote - Active quote, or `undefined` for placeholder row data
 * @returns Formatted quote fields for unified details and Batch Sell rows
 */
export const formatQuoteData = (
  quote: QuoteResponse | undefined,
  {
    sourceToken,
    destToken,
    sourceAmount,
    destTokenAmount,
    slippage,
    currency = '',
  }: {
    sourceToken?: Pick<BridgeToken, 'symbol'>;
    destToken?: Pick<BridgeToken, 'symbol'>;
    sourceAmount?: string;
    destTokenAmount?: string;
    slippage?: string;
    currency?: string;
  },
) => {
  const receivedAmountValue = quote?.quote.dest.normalizedAmount;
  const destSymbol = quote?.quote.dest.asset.symbol ?? destToken?.symbol;
  const quoteRate =
    Number(sourceAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(sourceAmount);

  const priceImpact = quote?.quote?.priceData?.priceImpact?.amount;
  const priceImpactPercentage = priceImpact
    ? `${(Number(priceImpact) * 100).toFixed(2)}%`
    : undefined;
  const priceImpactFiatValue =
    quote?.quote?.priceData?.priceImpact?.valueInCurrency;
  const priceImpactFiat = priceImpactFiatValue
    ? formatCurrency(priceImpactFiatValue, currency)
    : undefined;

  // Formats quote rate to show an appropriate number of decimal places
  // For numbers greater than 1, we show 2 decimal places. Example: 1.23456 -> 1.23
  // For numbers less than 1, we show 3 significant digits. Example: 0.00012345 -> 0.000123
  const quoteRateFormatter = getIntlNumberFormatter(I18n.locale, {
    ...(quoteRate && quoteRate > 1
      ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
      : { minimumSignificantDigits: 2, maximumSignificantDigits: 3 }),
  });
  const formattedQuoteRate = quoteRateFormatter.format(quoteRate ?? 0);
  const rate = quoteRate
    ? `1 ${sourceToken?.symbol} = ${formattedQuoteRate} ${destToken?.symbol}`
    : '--';

  return {
    networkFee: formatNetworkFee(currency, quote),
    estimatedTime: !quote
      ? undefined
      : quote.estimatedProcessingTimeInSeconds >= 60
        ? `${Math.ceil(quote.estimatedProcessingTimeInSeconds / 60)} min`
        : `${
            quote.estimatedProcessingTimeInSeconds >= 1
              ? `${quote.estimatedProcessingTimeInSeconds} seconds`
              : '< 1 second'
          }`,
    rate,
    priceImpact: priceImpactPercentage,
    priceImpactFiat,
    slippage: formatSlippageForQuoteDisplay(slippage),
    receivedAmount: formatTokenAmountWithSymbol(
      receivedAmountValue,
      destSymbol,
    ),
    receivedAmountFiat: formatQuoteDisplayValue({
      amount: receivedAmountValue,
      valueInCurrency: quote?.quote?.dest?.valueInCurrency,
      symbol: destSymbol,
      currency,
    }),
  };
};
