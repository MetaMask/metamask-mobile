import { BigNumber } from 'bignumber.js';
import { addCurrencySymbol } from '../../../../util/number';

/**
 * Formats a fiat amount for display on Money screens.
 *
 * This replicates the fiat balance formatting used by TokenListItem.
 *
 * - Zero and values ≥ $0.01 are formatted as `$X.XX` (two decimal places).
 * - Sub-cent values (> 0, < 0.01) are displayed as `< $0.01` to avoid
 * showing a misleading `$0.00` for a non-zero amount.
 *
 * The incoming `value` must already be denominated in `currentCurrency` —
 * this function is formatting-only and does not perform currency conversion.
 *
 * @param value - The fiat amount to format, already in the user's selected currency.
 * @param currentCurrency - The ISO currency code (e.g. `'usd'`, `'eur'`).
 * @returns A formatted fiat string with currency symbol.
 */
export const moneyFormatFiat = (
  value: BigNumber,
  currentCurrency: string,
): string => {
  const num = value.toNumber();
  return num >= 0.01 || num === 0
    ? addCurrencySymbol(num.toFixed(2), currentCurrency)
    : `< ${addCurrencySymbol('0.01', currentCurrency)}`;
};
