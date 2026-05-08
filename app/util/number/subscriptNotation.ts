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
