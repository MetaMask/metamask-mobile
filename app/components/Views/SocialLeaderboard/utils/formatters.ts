import {
  formatPerpsFiat,
  formatPercentage,
  formatTransactionDate,
} from '../../../UI/Perps/utils/formatUtils';
import formatNumber from '../../../../util/formatNumber';

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

export function formatTokenAmount(value: number): string {
  return formatNumber(value);
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
