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
    : sumAmounts(quote.quote?.feeData?.network);

  if (
    !fee?.valueInCurrency ||
    Number.isNaN(Number(fee.valueInCurrency)) ||
    Number.isNaN(Number(fee.normalizedAmount))
  )
    return '-';

  return formatFiat(new BigNumber(fee.valueInCurrency), currency);
};
