import BigNumber from 'bignumber.js';

/**
 * Parses a value to BigNumber, defaulting to 0 for invalid/empty input.
 * Handles comma-formatted strings (e.g., "1,000.50" → 1000.50).
 * Uses BigNumber to avoid floating-point precision errors.
 *
 * @param value - The value to parse (string or number)
 * @returns A BigNumber instance, defaulting to 0 if input is invalid/NaN
 *
 * @example
 * safeParseBigNumber('1,000.50') // BigNumber(1000.50)
 * safeParseBigNumber('') // BigNumber(0)
 * safeParseBigNumber(undefined) // BigNumber(0)
 * safeParseBigNumber('abc') // BigNumber(0)
 */
export function safeParseBigNumber(value?: string | number): BigNumber {
  const bn = new BigNumber(String(value ?? '0').replace(/,/g, ''));
  return bn.isNaN() ? new BigNumber(0) : bn;
}
