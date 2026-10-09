import { formatCurrency } from '../currencyUtils';

/**
 * Fiat values of limit orders show cents, never more.
 */
export const LIMIT_ORDER_FIAT_VALUE_DECIMALS = 2;
const MIN_DISPLAY_VALUE = 0.01;

/**
 * Formats a fiat value for display on the limit order screens with exactly two
 * decimal places, e.g. `$2,200.50`. A positive value that would round down to
 * zero reads as `<$0.01` instead of a misleading `$0.00`.
 *
 * @param value - The fiat value.
 * @param currency - The ISO 4217 code of the currency, e.g. "usd".
 * @returns The locale-formatted currency string.
 */
export const formatLimitOrderFiatValue = (
  value: number | string,
  currency: string,
): string => {
  const options = {
    minimumFractionDigits: LIMIT_ORDER_FIAT_VALUE_DECIMALS,
    maximumFractionDigits: LIMIT_ORDER_FIAT_VALUE_DECIMALS,
  };
  const numericValue = Number(value);

  if (numericValue > 0 && numericValue < MIN_DISPLAY_VALUE) {
    return `<${formatCurrency(MIN_DISPLAY_VALUE, currency, options)}`;
  }

  return formatCurrency(value, currency, options);
};
