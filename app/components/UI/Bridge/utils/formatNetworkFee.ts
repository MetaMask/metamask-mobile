import {
  type QuoteResponse,
  sumAmounts,
  type DeepPartial,
} from '@metamask/bridge-controller';
import { isNumberValue } from '../../../../util/number';
import formatFiat from '../../../../util/formatFiat';
import { BigNumber } from 'bignumber.js';
import { isGaslessQuote } from './isGaslessQuote';

export const formatNetworkFee = (
  currency: string,
  quote?: DeepPartial<QuoteResponse> | null,
) => {
  if (!quote) return '-';

  const fee = isGaslessQuote(quote.quote)
    ? sumAmounts(quote.quote?.feeData?.txFee)
    : sumAmounts(quote.quote?.feeData?.network, quote.quote?.feeData?.relayer);

  if (
    isGaslessQuote(quote.quote) &&
    fee?.valueInCurrency != null &&
    fee.amount != null &&
    isNumberValue(fee.amount) &&
    isNumberValue(fee.valueInCurrency)
  ) {
    return formatFiat(new BigNumber(fee.valueInCurrency), currency);
  } else if (isGaslessQuote(quote.quote)) {
    // Quote is gasless but included transaction fees are not set.
    // Return "uknown" gas fee to keep the same behavior
    // as the previous vesrions of this utility.
    return '-';
  }

  if (
    fee?.valueInCurrency != null &&
    fee.amount != null &&
    isNumberValue(fee.amount) &&
    isNumberValue(fee.valueInCurrency)
  ) {
    return formatFiat(new BigNumber(fee.valueInCurrency), currency);
  }

  return '-';
};
