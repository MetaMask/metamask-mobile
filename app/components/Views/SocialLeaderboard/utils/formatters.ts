import {
  formatPerpsFiat,
  formatPercentage,
  formatTransactionDate,
  formatLargeNumber,
} from '../../../UI/Perps/utils/formatUtils';
import { formatAmountWithThreshold } from '../../../../util/number';

const EM_DASH = '\u2014';

/**
 * USD for social leaderboard rows/cards: match perps-style fiat (always two
 * fractional digits for whole dollars). Rewards `formatUsd`/`formatFiat` omits
 * `.00` for integers and is not a drop-in here.
 */
export function formatUsd(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  const sign = value < 0 ? '-' : '';
  return sign + formatPerpsFiat(Math.abs(value), { stripTrailingZeros: false });
}

/**
 * Formats a raw token quantity for display in list rows.
 * - Values >= 1,000 are abbreviated with K/M/B/T suffixes (e.g. 216.65M).
 * - Smaller values are capped at 4 decimal places, with "< 0.00001" for dust.
 * - Returns "0" for zero, NaN, or non-finite inputs.
 */
export function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  if (Math.abs(value) >= 1000) {
    return formatLargeNumber(value, { decimals: 2, rawDecimals: 4 });
  }
  return String(formatAmountWithThreshold(value, 4));
}

export function formatPercent(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  return formatPercentage(value, 0);
}

/**
 * Trade timestamps from the social API may be seconds or milliseconds.
 */
export function formatTradeDate(timestamp: number): string {
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  return formatTransactionDate(ms);
}
