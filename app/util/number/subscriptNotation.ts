/**
 * Shared subscript notation formatting for very small numbers.
 * Used by addCurrencySymbol (number/index.js) and formatPriceWithSubscriptNotation (Predict/utils/format.ts).
 */

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/**
 * Converts a number to subscript notation
 * @param num - Number to convert
 * @returns String with subscript digits
 * @example toSubscript(6) => "₆"
 * @example toSubscript(12) => "₁₂"
 */
export const toSubscript = (num: number): string =>
  String(num)
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[parseInt(digit, 10)])
    .join('');

/**
 * Formats a very small positive number using subscript notation for leading zeros.
 * Only applies to numbers < 0.0001 with 4+ leading zeros after the decimal point.
 *
 * @param num - Positive number to format
 * @returns Formatted string like "0.0₅614" or null if subscript notation doesn't apply
 * @example formatSubscriptNotation(0.00000614) => "0.0₅614"
 * @example formatSubscriptNotation(0.01) => null
 * @example formatSubscriptNotation(0) => null
 */
export const formatSubscriptNotation = (num: number): string | null => {
  if (num <= 0 || num >= 0.0001) {
    return null;
  }

  const priceStr = num.toFixed(20);
  const match = priceStr.match(/^0\.0*([1-9]\d*)/);

  if (!match) {
    return null;
  }

  const leadingZeros = priceStr.indexOf(match[1]) - 2;

  if (leadingZeros < 4) {
    return null;
  }

  const significantDigits =
    match[1].slice(0, 4).replace(/0+$/, '') || match[1].slice(0, 2);
  return `0.0${toSubscript(leadingZeros)}${significantDigits}`;
};
