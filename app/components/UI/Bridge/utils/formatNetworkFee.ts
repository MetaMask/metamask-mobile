import { QuoteMetadata, QuoteResponse } from '@metamask/bridge-controller';
import { isNumberValue } from '../../../../util/number';
import formatFiat from '../../../../util/formatFiat';
import { BigNumber } from 'bignumber.js';

export const formatNetworkFee = (
  currency: string,
  quote?: (QuoteResponse & QuoteMetadata) | null,
) => {
  if (!quote?.totalNetworkFee) return '-';

  const { totalNetworkFee } = quote;

  const { amount, valueInCurrency } = totalNetworkFee;

  if (
    amount == null ||
    valueInCurrency == null ||
    !isNumberValue(amount) ||
    !isNumberValue(valueInCurrency)
  ) {
    return '-';
  }

  const formattedValueInCurrency = formatFiat(
    new BigNumber(valueInCurrency),
    currency,
  );

  return formattedValueInCurrency;
};
