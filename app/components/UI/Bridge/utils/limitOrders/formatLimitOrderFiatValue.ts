import { BigNumber } from 'bignumber.js';
import { addCurrencySymbol } from '../../../../../util/number/bigint';
import { formatSubscriptNotation } from '../../../../../util/number/subscriptNotation';
import { formatCurrency } from '../currencyUtils';

/**
 * Fiat values of limit orders show cents, never more. Only the unit price of a
 * cheap token may show more, to stay distinguishable from market.
 */
export const LIMIT_ORDER_FIAT_VALUE_DECIMALS = 2;

/**
 * Formats a fiat value for display on the limit order screens with two
 * decimal places, e.g. `$2,200.50`. A positive value that would round down to
 * zero reads as `<$0.01` instead of a misleading `$0.00`.
 *
 * @param value - The fiat value.
 * @param currency - The ISO 4217 code of the currency, e.g. "usd".
 * @param maximumFractionDigits - Decimal places shown at most, for a unit price
 * that needs more than cents. Trailing zeros past the cents are dropped.
 * @returns The locale-formatted currency string.
 */
export const formatLimitOrderFiatValue = (
  value: number | string,
  currency: string,
  maximumFractionDigits: number = LIMIT_ORDER_FIAT_VALUE_DECIMALS,
): string => {
  const options = {
    minimumFractionDigits: LIMIT_ORDER_FIAT_VALUE_DECIMALS,
    maximumFractionDigits: Math.max(
      maximumFractionDigits,
      LIMIT_ORDER_FIAT_VALUE_DECIMALS,
    ),
  };
  const minDisplayValue = 10 ** -options.maximumFractionDigits;
  const numericValue = Number(value);

  if (numericValue > 0 && numericValue < minDisplayValue) {
    return `<${formatCurrency(minDisplayValue, currency, options)}`;
  }

  return formatCurrency(value, currency, options);
};

/**
 * Formats the fiat unit price of a token like {@link formatLimitOrderFiatValue},
 * except that the leading zeros of a cheap token's price are condensed, e.g.
 * `$0.0₅3799` rather than `$0.000003799`.
 *
 * @param value - The fiat price of 1 unit of the token.
 * @param currency - The ISO 4217 code of the currency, e.g. "usd".
 * @param maximumFractionDigits - Decimal places the price is rounded to.
 * @returns The formatted price.
 */
export const formatLimitOrderFiatUnitPrice = (
  value: number | string,
  currency: string,
  maximumFractionDigits: number = LIMIT_ORDER_FIAT_VALUE_DECIMALS,
): string => {
  const rounded = new BigNumber(value)
    .decimalPlaces(
      Math.max(maximumFractionDigits, LIMIT_ORDER_FIAT_VALUE_DECIMALS),
    )
    .toNumber();

  return formatSubscriptNotation(rounded)
    ? addCurrencySymbol(rounded, currency, false, true)
    : formatLimitOrderFiatValue(value, currency, maximumFractionDigits);
};
