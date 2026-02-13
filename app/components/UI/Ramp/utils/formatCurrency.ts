import { getIntlNumberFormatter } from '../../../../util/intl';
import I18n from '../../../../../locales/i18n';

const DEFAULT_MAX_TOKEN_DECIMALS = 6;

/**
 * Formats a token/crypto amount with a maximum number of decimal places.
 * @param amount - The amount to format (number or string)
 * @param symbol - The token symbol (e.g., 'ETH', 'USDC')
 * @param options - Optional. maxDecimals defaults to 6
 * @returns Formatted string e.g. "0.05 ETH"
 */
export function formatTokenAmount(
  amount: number | string,
  symbol: string,
  options?: { maxDecimals?: number },
): string {
  try {
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    const maxDecimals = options?.maxDecimals ?? DEFAULT_MAX_TOKEN_DECIMALS;
    const formatted = getIntlNumberFormatter(I18n.locale, {
      maximumFractionDigits: maxDecimals,
      minimumFractionDigits: 0,
    }).format(num);
    return symbol ? `${formatted} ${symbol}` : formatted;
  } catch (error) {
    return `${amount} ${symbol}`.trim();
  }
}

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
