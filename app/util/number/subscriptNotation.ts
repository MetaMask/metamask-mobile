/**
 * Shared subscript notation formatting for very small numbers.
 * Used by addCurrencySymbol (number/index.js) and formatPriceWithSubscriptNotation below.
 */

import currencySymbols from '../currency-symbols.json';

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/**
 * Converts a number to subscript notation
 * @param num - Number to convert
 * @returns String with subscript digits
 * @example toSubscript(6) => "₆"
 * @example toSubscript(12) => "₁₂"
 */
const toSubscript = (num: number): string =>
  String(num)
    .split('')
    .map((digit) => SUBSCRIPT_DIGITS[parseInt(digit, 10)])
    .join('');

export interface FormatSubscriptNotationOptions {
  /**
   * Caps how many digits appear after the subscript (the “tail” after `0.0ₙ`).
   * When omitted, uses the default (up to 4 digits, with trailing-zero trimming).
   * @example maxDigitsAfterSubscript: 2 → "0.0₅34" instead of "0.0₅3415"
   */
  maxDigitsAfterSubscript?: number;
}

/**
 * Formats a very small positive number using subscript notation for leading zeros.
 * Only applies to numbers < 0.0001 with 4+ leading zeros after the decimal point.
 *
 * @param num - Positive number to format
 * @param options - Optional cap on digits after the subscript marker
 * @returns Formatted string like "0.0₅614" or null if subscript notation doesn't apply
 * @example formatSubscriptNotation(0.00000614) => "0.0₅614"
 * @example formatSubscriptNotation(0.01) => null
 * @example formatSubscriptNotation(0) => null
 */
export const formatSubscriptNotation = (
  num: number,
  options?: FormatSubscriptNotationOptions,
): string | null => {
  if (num > 0 && num < 0.0001) {
    const priceStr = num.toFixed(20);
    const match = priceStr.match(/^0\.0*([1-9]\d*)/);

    if (match) {
      const leadingZeros = priceStr.indexOf(match[1]) - 2;

      if (leadingZeros >= 4) {
        const maxTail = options?.maxDigitsAfterSubscript;
        const tail = match[1].slice(0, maxTail ?? 4);
        const significantDigits =
          maxTail !== undefined
            ? tail
            : tail.replace(/0{1,4}$/, '') || match[1].slice(0, 2);
        return `0.0${toSubscript(leadingZeros)}${significantDigits}`;
      }
    }
  }

  return null;
};

/**
 * Formats a price value with subscript notation for very small values
 * - Uses subscript notation for values with 4+ leading zeros (e.g., 0.00000614 → $0.0₅614)
 * - The subscript indicates the number of leading zeros after the decimal point
 * - Returns "—" for zero values
 * - Values >= 1: exactly 2 decimal places (e.g. $2,285.01)
 * - Values < 1: up to 4 decimal places (e.g. $0.1446)
 * @param price - The price value to format (string or number)
 * @param currencyCode - ISO 4217 currency code (e.g. 'USD', 'EUR'). Defaults to 'USD'.
 * @param options - Optional; set `maxDigitsAfterSubscript` to shorten the digit tail after `0.0ₙ` (e.g. compact OHLC rows).
 * @returns Formatted price string with currency symbol or "—" for zero
 * @example formatPriceWithSubscriptNotation(2285.013) => "$2,285.01"
 * @example formatPriceWithSubscriptNotation(1.99) => "$1.99"
 * @example formatPriceWithSubscriptNotation(0.144566) => "$0.1446"
 * @example formatPriceWithSubscriptNotation(0.00000614) => "$0.0₅614"
 * @example formatPriceWithSubscriptNotation(0) => "—"
 * @example formatPriceWithSubscriptNotation(1.2345, 'EUR') => "€1.23"
 * @example formatPriceWithSubscriptNotation(0.00003415, 'USD', { maxDigitsAfterSubscript: 2 }) => "$0.0₄34"
 */
export interface FormatPriceWithSubscriptNotationOptions
  extends FormatSubscriptNotationOptions {
  /** Override the default max decimal places (2 for ≥1, 4 for <1). */
  maximumFractionDigits?: number;
}

export const formatPriceWithSubscriptNotation = (
  price: string | number,
  currencyCode = 'USD',
  options?: FormatPriceWithSubscriptNotationOptions,
): string => {
  const num = typeof price === 'string' ? parseFloat(price) : price;

  if (isNaN(num)) {
    return '$0.00';
  }

  if (num === 0) {
    return '—';
  }

  // Known symbol (e.g. $, €) → prefix; unknown code (e.g. PLN) → suffix
  // Matches addCurrencySymbol convention used elsewhere in the app
  const symbol =
    currencySymbols[currencyCode.toLowerCase() as keyof typeof currencySymbols];
  const addSymbol = (n: string) =>
    symbol ? `${symbol}${n}` : `${n} ${currencyCode.toUpperCase()}`;

  const subscript = formatSubscriptNotation(num, options);
  if (subscript) return addSymbol(subscript);

  const maximumFractionDigits =
    options?.maximumFractionDigits ?? (num >= 1 ? 2 : 4);
  const formattedNumber = new Intl.NumberFormat('en-US', {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(num);
  return addSymbol(formattedNumber);
};
