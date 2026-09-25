import {
  EM_DASH,
  formatAbbreviatedUsd,
  formatCount,
  formatHoldDuration,
  formatPercent,
  formatUnsignedFullUsdNoDecimals,
} from '../../utils/formatters';
import { MINUTE } from '../../../../../constants/time';

/** Prefix for numbers that still come from a local mock, not the API. */
export const FAKE_STATS_PREFIX = '*';

export function prefixFakeStat(label: string, isFake: boolean): string {
  if (!isFake || !label || label === EM_DASH) {
    return label;
  }
  return `${FAKE_STATS_PREFIX}${label}`;
}

export interface StatsSheetFallbackFields {
  winRate?: boolean;
  pnl?: boolean;
  holdTime?: boolean;
  timesCopied?: boolean;
  volume?: boolean;
  tradeCount?: boolean;
  profileAge?: boolean;
  copySuccessRate?: boolean;
}

/** Unsigned full USD for the sheet hero (e.g. `$7,100`). Sign is shown via color. */
export function formatSheetUnsignedUsd(
  value: number | null | undefined,
): string {
  if (value == null) {
    return '';
  }
  const label = formatUnsignedFullUsdNoDecimals(value);
  return label === EM_DASH ? '' : label;
}

export function formatSheetAbbreviatedUsd(
  value: number | null | undefined,
): string {
  if (value == null) {
    return '';
  }
  return formatAbbreviatedUsd(value);
}

export function formatSheetWinRate(
  winRate30d: number | null | undefined,
): string {
  if (winRate30d == null) {
    return '';
  }
  return formatPercent(winRate30d * 100, {
    showSign: false,
    decimals: 0,
    fallback: '',
  });
}

export function formatSheetCount(value: number | null | undefined): string {
  if (value == null) {
    return '';
  }
  return formatCount(value);
}

/** Compact hold label (`4d`, `8h`, `1d 20h`) — reuses feed/composer {@link formatHoldDuration}. */
export function formatSheetHoldFromMinutes(
  minutes: number | null | undefined,
): string {
  if (minutes == null) {
    return '';
  }
  const label = formatHoldDuration(minutes * MINUTE);
  return label === EM_DASH ? '' : label;
}
