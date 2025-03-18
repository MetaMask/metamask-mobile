import {
  NON_NUMERIC_EXCEPT_DECIMAL_REGEX,
  ALL_DECIMAL_POINTS_REGEX,
} from '../constants/regex';

/**
 * Parses currency strings to return their numeric representation
 * ```typescript
 * parseCurrencyString('$55.50') = 55.50
 * ```
 * @param str The string to parse
 * @returns Parsed number
 */
export const parseCurrencyString = (str: string) => {
  if (!str) return 0.0;

  // Remove all characters that aren't a digit or period.
  let cleaned = str.replace(NON_NUMERIC_EXCEPT_DECIMAL_REGEX, '');

  const firstDecimalIndex = cleaned.indexOf('.');

  if (firstDecimalIndex !== -1) {
    // Keep the substring up to & including the first decimal point
    const beforeDecimal = cleaned.slice(0, firstDecimalIndex + 1);

    // Remove all subsequent decimal points
    const afterDecimal = cleaned
      .slice(firstDecimalIndex + 1)
      .replace(ALL_DECIMAL_POINTS_REGEX, '');

    // Rebuild the string
    cleaned = beforeDecimal + afterDecimal;
  }

  return parseFloat(cleaned);
};
