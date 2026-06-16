// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { addThousandsSeparator } from '../../../../SocialLeaderboard/utils/numberFormatting';

const EM_DASH = '—';

/**
 * Format a raw USD PnL number for display in trader rows and cards.
 *
 * Shows the full value with thousands separators and exactly two decimal
 * places, signed (e.g. "+$963,146.80", "-$1,200.00"). Uses manual formatting
 * because React Native's Hermes engine does not honour `toLocaleString`
 * fraction-digit options. Returns an em-dash for missing/non-finite values so
 * the row never shows a misleading "+$0.00" or "-$NaN.NaN".
 *
 * @param value - Raw USD PnL value.
 * @returns Signed, full-precision USD string, or an em-dash when absent.
 */
export function formatFullPnl(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  const sign = value >= 0 ? '+' : '-';
  const [whole, decimals] = Math.abs(value).toFixed(2).split('.');
  return `${sign}$${addThousandsSeparator(whole)}.${decimals}`;
}
