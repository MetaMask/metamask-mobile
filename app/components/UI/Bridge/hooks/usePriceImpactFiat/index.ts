import { useSelector } from 'react-redux';
import { QuoteMetadata } from '@metamask/bridge-controller';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { formatCurrency } from '../../utils/currencyUtils';

/**
 * Returns the fiat price impact for a bridge quote — the difference between
 * the source input fiat amount and the destination output fiat amount,
 * formatted in the user's current currency (e.g. "$4.23", "€3.90").
 *
 * Returns `undefined` when either fiat value is unavailable.
 */
export const usePriceImpactFiat = (
  activeQuote: QuoteMetadata | null | undefined,
): string | undefined => {
  const currentCurrency = useSelector(selectCurrentCurrency);

  if (!activeQuote) return undefined;

  const sourceFiat = activeQuote.sentAmount?.valueInCurrency;
  const destFiat = activeQuote.toTokenAmount?.valueInCurrency;

  if (sourceFiat == null || destFiat == null) return undefined;

  const diff = Number(sourceFiat) - Number(destFiat);
  return formatCurrency(diff, currentCurrency);
};
