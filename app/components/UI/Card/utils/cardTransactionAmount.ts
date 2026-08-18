import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import type { CardTransactionAmount } from '../../../../core/Engine/controllers/card-controller/provider-types';

export function formatCardAmount(
  amount: CardTransactionAmount,
  isDebit?: boolean,
): string {
  const numericValue = Number(amount.value);
  const sign = isDebit === undefined ? '' : isDebit ? '-' : '+';

  if (!Number.isFinite(numericValue)) {
    const fallback = `${amount.value} ${amount.currency}`;
    return isDebit === undefined ? fallback : `${sign}${fallback}`;
  }

  const absValue = Math.abs(numericValue);

  let formatted: string;
  try {
    formatted = getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency: amount.currency,
      currencyDisplay: 'narrowSymbol',
    }).format(absValue);
  } catch {
    formatted = `${amount.value} ${amount.currency}`;
    return isDebit === undefined ? formatted : `${sign}${formatted}`;
  }

  // Intl may already include a minus for negative inputs; we always format the
  // absolute value and apply our own debit/credit sign.
  const withoutLeadingSign = formatted.replace(/^[+-]/, '');
  return `${sign}${withoutLeadingSign}`;
}
