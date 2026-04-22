import {
  formatPercentage,
  formatTransactionDate,
} from '../../../UI/Perps/utils/formatUtils';
import { formatUsd as formatUsdFiat } from '../../../UI/Rewards/utils/formatUtils';
import formatNumber from '../../../../util/formatNumber';

const EM_DASH = '\u2014';

export function formatUsd(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  return formatUsdFiat(value);
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
