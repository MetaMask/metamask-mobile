/**
 * Format a raw PnL number into a compact display string.
 *
 * Uses manual rounding instead of `toLocaleString` options because
 * React Native's Hermes engine does not honour `maximumFractionDigits`.
 *
 * @param value - Raw USD PnL value.
 * @returns Formatted string like "+$963K" or "-$1,200".
 */
export function formatPnl(value: number): string {
  const rounded = Math.round(Math.abs(value));
  const sign = value >= 0 ? '+' : '-';

  if (rounded >= 1_000) {
    return `${sign}$${addCommas(Math.round(rounded / 1_000))}K`;
  }
  return `${sign}$${addCommas(rounded)}`;
}

function addCommas(n: number): string {
  const str = n.toString();
  let result = '';
  for (let i = 0; i < str.length; i++) {
    if (i > 0 && (str.length - i) % 3 === 0) {
      result += ',';
    }
    result += str[i];
  }
  return result;
}
