import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import { isNumberValue } from '../../../../util/number';
import formatFiat from '../../../../util/formatFiat';
import { BigNumber } from 'bignumber.js';
import { isGaslessQuote } from './isGaslessQuote';

export interface FormatNetworkFeeOptions {
  /** When true, treat quote as not gasless (e.g. hardware wallet: always show normal fee) */
  treatAsNotGasless?: boolean;
}

export const formatNetworkFee = (
  currency: string,
  quote?: (QuoteResponse & QuoteMetadata) | null,
  options: FormatNetworkFeeOptions = {},
) => {
  if (!quote) return '-';

  const { treatAsNotGasless = false } = options;
  const effectivelyGasless = !treatAsNotGasless && isGaslessQuote(quote.quote);

  if (
    effectivelyGasless &&
    quote.includedTxFees?.valueInCurrency != null &&
    quote.includedTxFees?.amount != null &&
    isNumberValue(quote.includedTxFees.amount) &&
    isNumberValue(quote.includedTxFees.valueInCurrency)
  ) {
    return formatFiat(
      new BigNumber(quote.includedTxFees.valueInCurrency),
      currency,
    );
  } else if (effectivelyGasless) {
    // Quote is gasless but includedTxFees is not set.
    // Return "uknown" gas fee to keep the same behavior
    // as the previous vesrions of this utility.
    return '-';
  }

  if (
    quote.totalNetworkFee?.valueInCurrency != null &&
    quote.totalNetworkFee?.amount != null &&
    isNumberValue(quote.totalNetworkFee.amount) &&
    isNumberValue(quote.totalNetworkFee.valueInCurrency)
  ) {
    return formatFiat(
      new BigNumber(quote.totalNetworkFee.valueInCurrency),
      currency,
    );
  }

  if (
    quote.gasFee?.effective?.valueInCurrency != null &&
    quote.gasFee?.effective?.amount != null &&
    isNumberValue(quote.gasFee.effective.amount) &&
    isNumberValue(quote.gasFee.effective.valueInCurrency)
  ) {
    return formatFiat(
      new BigNumber(quote.gasFee.effective.valueInCurrency),
      currency,
    );
  }

  return '-';
};
