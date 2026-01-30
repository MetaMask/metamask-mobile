import { getIntlNumberFormatter } from '../../../../util/intl';
import I18n from '../../../../../locales/i18n';

/**
 * Formats currency amounts using the device's locale
 * @param amount - The amount to format (number or string)
 * @param currency - The currency code (e.g., 'USD', 'EUR')
 * @param options - Additional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(
  amount: number | string,
  currency: string,
  options?: Intl.NumberFormatOptions,
): string {
  try {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    const defaultOptions: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: currency || 'USD',
      currencyDisplay: 'symbol',
    };

    return getIntlNumberFormatter(I18n.locale, {
      ...defaultOptions,
      ...options,
    }).format(numAmount);
  } catch (error) {
    console.error('Error formatting currency:', error);
    return amount.toString();
  }
}
