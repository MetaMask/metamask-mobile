/**
 * Format a raw PnL number into a compact display string.
 *
 * @param value - Raw USD PnL value.
 * @returns Formatted string like "+$45,900K" or "-$1,200".
 */
export function formatPnl(value: number): string {
  const abs = Math.abs(value);
  const sign = value >= 0 ? '+' : '-';

  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toLocaleString(undefined, { maximumFractionDigits: 0 })}K`;
  }
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
