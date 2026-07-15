/**
 * Kalshi monetary values are cents (integers); canonical Predict values are
 * decimal strings in the settlement currency (USDC, 6 decimals, but we cap
 * display at the venue's reported cent precision = 2 dp for USD).
 *
 * Order prices are 1-99 cents per contract on Kalshi; canonical 0-1 probability.
 *
 * These helpers are intentionally tiny — the POC needs symmetry with the mobile
 * adapter, not a money library.
 */

export type DecimalString = string;

export function centsToDecimal(amountCents: number): DecimalString {
  const sign = amountCents < 0 ? '-' : '';
  const abs = Math.abs(Math.trunc(amountCents));
  const whole = Math.trunc(abs / 100);
  const frac = (abs % 100).toString().padStart(2, '0');
  return `${sign}${whole}.${frac}`;
}

export function decimalToCents(amount: DecimalString): number {
  const trimmed = amount.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid decimal string: ${amount}`);
  }
  const [whole, frac = ''] = trimmed.replace(/^-/, '').split('.');
  const padded = (frac + '00').slice(0, 2);
  const value = Number(whole) * 100 + Number(padded || '0');
  return trimmed.startsWith('-') ? -value : value;
}

/** Convert a Kalshi 1-99 contract cent price into a 0-1 probability string. */
export function contractPriceCentsToProbability(price: number): DecimalString {
  const clamped = Math.max(0, Math.min(100, Math.round(price)));
  const whole = Math.trunc(clamped / 100);
  const frac = (clamped % 100).toString().padStart(2, '0');
  return `${whole}.${frac}`;
}

/** Convert a 0-1 probability string back into a Kalshi 1-99 contract cent price. */
export function probabilityToContractPriceCents(prob: DecimalString): number {
  const n = Number(prob);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid probability: ${prob}`);
  }
  return Math.max(1, Math.min(99, Math.round(n * 100)));
}
