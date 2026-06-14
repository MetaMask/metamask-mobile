export type UsdAmountRange =
  | '< 0.01'
  | '0.01 - 0.99'
  | '1.00 - 9.99'
  | '10.00 - 99.99'
  | '100.00 - 999.99'
  | '1000.00+';

/**
 * Buckets a USD amount into a range string for analytics.
 *
 * Accepts either:
 * - A number (or undefined, treated as 0)
 * - A string amount from the Merkl API, which may start with '<' to indicate sub-cent values
 */
export const getUsdAmountRange = (
  amount: number | string | undefined,
): UsdAmountRange => {
  if (typeof amount === 'string') {
    if (amount.startsWith('<')) return '< 0.01';
    return getUsdAmountRange(parseFloat(amount));
  }
  const value = amount ?? 0;
  if (value < 0.01) return '< 0.01';
  if (value < 1) return '0.01 - 0.99';
  if (value < 10) return '1.00 - 9.99';
  if (value < 100) return '10.00 - 99.99';
  if (value < 1000) return '100.00 - 999.99';
  return '1000.00+';
};
