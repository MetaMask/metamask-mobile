import I18n from '../../../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../../../util/intl';

/**
 * Formats a subscription amount as localized fiat using the device locale.
 *
 * @param amount - Amount in major currency units.
 * @param currency - ISO-4217 currency code, case-insensitive.
 * @returns A localized currency string, or a plain fallback when Intl rejects the currency.
 */
export const formatSubscriptionFiat = (
  amount: number,
  currency: string,
): string => {
  const currencyCode = currency.toUpperCase();

  try {
    return getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency: currencyCode,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
};
