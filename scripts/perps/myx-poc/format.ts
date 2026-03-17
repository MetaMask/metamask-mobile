/**
 * MYX PoC — Formatting utilities
 *
 * Reusable helpers for converting raw on-chain / API values
 * into human-readable strings.
 */

/**
 * Format a raw token amount (bigint string) to human-readable with decimals.
 * e.g. "25731940913776519597" with 18 decimals -> "25.7319"
 */
export function formatTokenAmount(
  raw: string | bigint,
  decimals: number,
  displayDecimals = 4,
): string {
  const str = String(raw);
  if (str === '0' || str === '') return '0';

  const isNegative = str.startsWith('-');
  const abs = isNegative ? str.slice(1) : str;
  const padded = abs.padStart(decimals + 1, '0');
  const whole = padded.slice(0, padded.length - decimals) || '0';
  const frac = padded.slice(padded.length - decimals);
  const truncated = frac.slice(0, displayDecimals);
  const sign = isNegative ? '-' : '';

  if (displayDecimals === 0) return `${sign}${whole}`;
  return `${sign}${whole}.${truncated}`;
}

/**
 * Format a USD amount for display (e.g. "25.7319 USDT")
 */
export function formatUsd(
  raw: string | bigint,
  decimals: number,
  symbol: string,
  displayDecimals = 4,
): string {
  return `${formatTokenAmount(raw, decimals, displayDecimals)} ${symbol}`;
}

/**
 * Format a price for display
 */
export function formatPrice(price: string | number, dp = 2): string {
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(n) || n === 0) return '-';
  return `$${n.toFixed(dp)}`;
}

/**
 * Format a percentage
 */
export function formatPct(value: string | number, dp = 2): string {
  const n = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(n)) return '-';
  return `${n.toFixed(dp)}%`;
}

/**
 * Labeled row output for account-style display
 */
export function printLabeledRows(
  rows: { label: string; value: string }[],
): void {
  const maxLabel = Math.max(...rows.map((r) => r.label.length));
  for (const { label, value } of rows) {
    console.log(`  ${label.padEnd(maxLabel)}  ${value}`);
  }
}
