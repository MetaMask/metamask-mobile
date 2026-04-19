/**
 * Convert a human-readable decimal string amount to its atomic (integer)
 * representation at a given number of decimals.
 *
 * @example
 *   toAtomicAmount('1.5', 18)  -> '1500000000000000000'
 *   toAtomicAmount('0.01', 6)  -> '10000'
 *   toAtomicAmount('', 18)     -> '0'
 *
 * @throws Error when the input contains non-numeric characters, more than
 *   one decimal point, or more fractional digits than `decimals` allows.
 */
export function toAtomicAmount(value: string, decimals: number): string {
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 77) {
    throw new Error(`Invalid decimals: ${decimals}`);
  }
  const trimmed = (value ?? '').trim();
  if (!trimmed) {
    return '0';
  }
  if (!/^\d*\.?\d*$/.test(trimmed) || trimmed === '.') {
    throw new Error(`Invalid amount: ${value}`);
  }

  const [whole = '', fraction = ''] = trimmed.split('.');
  if (fraction.length > decimals) {
    throw new Error(
      `Amount has more fractional digits (${fraction.length}) than allowed by decimals (${decimals})`,
    );
  }

  const padded = fraction.padEnd(decimals, '0');
  const combined = `${whole}${padded}`.replace(/^0+(?=\d)/, '');
  return combined === '' ? '0' : combined;
}
