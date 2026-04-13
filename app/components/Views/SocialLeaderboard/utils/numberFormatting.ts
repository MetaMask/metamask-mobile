/**
 * Inserts comma thousand-separators into an integer string.
 *
 * Uses an explicit loop instead of a regex to avoid super-linear backtracking
 * that would occur with the standard /\B(?=(\d{3})+(?!\d))/g pattern.
 *
 * @param numStr - String representation of a non-negative integer (no sign, no decimal).
 * @returns The same digits with commas inserted every three digits from the right.
 *
 * @example
 * addThousandsSeparator('1234567') // '1,234,567'
 * addThousandsSeparator('999')     // '999'
 */
export function addThousandsSeparator(numStr: string): string {
  let result = '';
  for (let i = 0; i < numStr.length; i++) {
    if (i > 0 && (numStr.length - i) % 3 === 0) {
      result += ',';
    }
    result += numStr[i];
  }
  return result;
}
