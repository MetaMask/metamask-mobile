import { addThousandsSeparator } from '../../../../SocialLeaderboard/utils/numberFormatting';

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
    return `${sign}$${addThousandsSeparator(String(Math.round(rounded / 1_000)))}K`;
  }
  return `${sign}$${addThousandsSeparator(String(rounded))}`;
}
