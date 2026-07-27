import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type { CardTransactionAmount } from '../../../../core/Engine/controllers/card-controller/provider-types';

/**
 * Formats a card transaction amount with a currency symbol (e.g. "$11.95", "R$61.35").
 * Falls back to `${value} ${currency}` when Intl rejects the currency code.
 */
export function formatCardAmount(
  amount: CardTransactionAmount,
  isDebit?: boolean,
): string {
  const numericValue = Number(amount.value);
  const absValue = Number.isFinite(numericValue)
    ? Math.abs(numericValue)
    : amount.value;
  const sign = isDebit === undefined ? '' : isDebit ? '-' : '+';

  let formatted: string;
  try {
    formatted = getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency: amount.currency,
      currencyDisplay: 'narrowSymbol',
    }).format(typeof absValue === 'number' ? absValue : Number(absValue));
  } catch {
    formatted = `${amount.value} ${amount.currency}`;
    return isDebit === undefined ? formatted : `${sign}${formatted}`;
  }

  // Intl may already include a minus for negative inputs; we always format the
  // absolute value and apply our own debit/credit sign.
  const withoutLeadingSign = formatted.replace(/^[+-]/, '');
  return `${sign}${withoutLeadingSign}`;
}
