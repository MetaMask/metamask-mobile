import {
  type QuoteResponse,
  sumAmounts,
  type DeepPartial,
} from '@metamask/bridge-controller';
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
    !fee?.valueInCurrency ||
    isNaN(Number(fee.valueInCurrency)) ||
    isNaN(Number(fee.normalizedAmount))
  )
    return '-';

  if (isGaslessQuote(quote.quote)) {
    return formatFiat(new BigNumber(fee.valueInCurrency), currency);
  }

  return formatFiat(new BigNumber(fee.valueInCurrency), currency);
};
