import { BigNumber } from 'bignumber.js';
import I18n from '../../../../../locales/i18n';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { FIAT_INPUT_DECIMALS } from './sourceAmountInputMode';

const FIAT_PRICE_SIGNIFICANT_DIGITS = 4;

/**
 * Returns the decimal places needed to preserve four significant digits for
 * sub-unit fiat prices while keeping standard fiat values at two decimals.
 */
export function getFiatPriceDecimals(
  price: BigNumber.Value | undefined,
): number {
  const value = new BigNumber(price ?? NaN);
  if (!value.isFinite() || value.lte(0) || value.gte(1) || value.e === null) {
    return FIAT_INPUT_DECIMALS;
  }

  return FIAT_PRICE_SIGNIFICANT_DIGITS - 1 - value.e;
}

/**
 * Formats a minimum received amount, always rounding down to ensure users
 * never see a minimum higher than they might actually receive.
 */
export function formatMinimumReceived(amount: number | string): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return '0';

  // Floor to 8 decimal places before formatting
  const flooredAmount = Math.floor(numAmount * 1e8) / 1e8;

  return getIntlNumberFormatter(I18n.locale, {
    maximumSignificantDigits: 8,
  }).format(flooredAmount);
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
    return String(amount);
  }
}

export function getCurrencySymbol(currency: string): string {
  const normalizedCurrency = (currency || 'USD').toUpperCase();

  try {
    const formattedZero = getIntlNumberFormatter(I18n.locale, {
      style: 'currency',
      currency: normalizedCurrency,
      currencyDisplay: 'symbol',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);

    const currencySymbol = formattedZero.replace(/[\d\s.,'’_-]/gu, '').trim();

    if (currencySymbol && currencySymbol.toUpperCase() !== normalizedCurrency) {
      return currencySymbol;
    }
  } catch (error) {
    console.error('Error getting currency symbol:', error);
  }

  return normalizedCurrency;
}
