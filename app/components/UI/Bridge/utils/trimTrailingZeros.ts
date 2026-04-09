/**
 * Strips trailing zeros after a decimal point and removes a dangling decimal.
 * Uses character iteration instead of regex to avoid backtracking risks.
 *
 * @example
 * trimTrailingZeros('1.5000') // '1.5'
 * trimTrailingZeros('2.00')   // '2'
 * trimTrailingZeros('3')      // '3'
 */
export function trimTrailingZeros(value: string): string {
  if (!value.includes('.')) return value;

  let end = value.length;
  while (end > 0 && value[end - 1] === '0') end--;
  if (end > 0 && value[end - 1] === '.') end--;

  return value.slice(0, end);
}
