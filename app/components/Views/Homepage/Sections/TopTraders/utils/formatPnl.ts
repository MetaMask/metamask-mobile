// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { addThousandsSeparator } from '../../../../SocialLeaderboard/utils/numberFormatting';

/**
 * Format a raw USD PnL number for display in trader rows and cards.
 *
 * Shows the full value with thousands separators and exactly two decimal
 * places, signed (e.g. "+$963,146.80", "-$1,200.00"). Uses manual formatting
 * because React Native's Hermes engine does not honour `toLocaleString`
 * fraction-digit options.
 *
 * @param value - Raw USD PnL value.
 * @returns Signed, full-precision USD string.
 */
export function formatFullPnl(value: number): string {
  const sign = value >= 0 ? '+' : '-';
  const [whole, decimals] = Math.abs(value).toFixed(2).split('.');
  return `${sign}$${addThousandsSeparator(whole)}.${decimals}`;
}
