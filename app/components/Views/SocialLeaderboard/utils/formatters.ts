import {
  formatPerpsFiat,
  formatPercentage,
} from '../../../UI/Perps/utils/formatUtils';
import {
  formatAmountWithThreshold,
  localizeLargeNumber,
} from '../../../../util/number';
import { toDateFormat, formatTimestampToYYYYMMDD } from '../../../../util/date';
import { strings } from '../../../../../locales/i18n';

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
 * USD with explicit sign on positives. Use for PnL where direction matters
 * (e.g. `+$0.12`, `-$1,234.56`). Zero is rendered without a sign.
 */
export function formatSignedUsd(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  if (value === 0) return formatPerpsFiat(0, { stripTrailingZeros: false });
  const sign = value > 0 ? '+' : '-';
  return sign + formatPerpsFiat(Math.abs(value), { stripTrailingZeros: false });
}

/**
 * Signed USD with the full (non-abbreviated) number, thousands separators and
 * no fractional digits. Used for the profile 30D P&L headline
 * (e.g. `+$82,610,666`). Zero renders without a sign.
 */
export function formatSignedFullUsdNoDecimals(
  value: number | null | undefined,
): string {
  if (value == null) return EM_DASH;
  if (value === 0) {
    return formatPerpsFiat(0, { minimumDecimals: 0, maximumDecimals: 0 });
  }
  const sign = value > 0 ? '+' : '-';
  return (
    sign +
    formatPerpsFiat(Math.abs(value), {
      minimumDecimals: 0,
      maximumDecimals: 0,
    })
  );
}

// Ordered largest → smallest. Walk down and promote when rounding pushes a
// value past the bucket boundary (e.g. `999_999` rounds to `1000K`, which
// we want as `$1M`, not `$1000K`).
const CURRENCY_BUCKETS: readonly (readonly [number, string])[] = [
  [1e12, 'T'],
  [1e9, 'B'],
  [1e6, 'M'],
  [1e3, 'K'],
];

function renderBucket(value: number, suffix: string): string {
  const str = value % 1 === 0 ? value.toFixed(0) : value.toFixed(1);
  return `$${str}${suffix}`;
}

function shortenAbsCurrency(abs: number): string {
  if (abs < 1e3) return `$${abs.toFixed(2)}`;
  for (let i = 0; i < CURRENCY_BUCKETS.length; i++) {
    const [divisor, suffix] = CURRENCY_BUCKETS[i];
    if (abs < divisor) continue;
    const value = Math.round((abs / divisor) * 10) / 10;
    if (value >= 1_000 && i > 0) {
      const [nextDivisor, nextSuffix] = CURRENCY_BUCKETS[i - 1];
      const promoted = Math.round((abs / nextDivisor) * 10) / 10;
      return renderBucket(promoted, nextSuffix);
    }
    return renderBucket(value, suffix);
  }
  return `$${abs.toFixed(2)}`;
}

/**
 * Signed USD with K/M/B/T abbreviation for ≥$1K values. Used for compact
 * PnL displays like the 7D Return headline (`+$117.2K`, `+$1.2M`, `-$500`).
 */
export function formatSignedAbbreviatedUsd(
  value: number | null | undefined,
): string {
  if (value == null) return EM_DASH;
  if (value === 0) return shortenAbsCurrency(0);
  const sign = value > 0 ? '+' : '-';
  return sign + shortenAbsCurrency(Math.abs(value));
}

/**
 * Formats a raw token quantity for display in list rows.
 * - Values >= 1,000 are abbreviated with K/M/B/T suffixes (e.g. 216.65M).
 * - Smaller values are capped at 4 decimal places, with "< 0.00001" for dust.
 * - Returns "0" for zero, NaN, or non-finite inputs.
 */
export function formatTokenAmount(value: number): string {
  if (!Number.isFinite(value) || value === 0) return '0';
  const absValue = Math.abs(value);
  if (absValue >= 1000) {
    const sign = value < 0 ? '-' : '';
    const i18n = { t: (key: string) => strings(key) };
    return (
      sign +
      localizeLargeNumber(i18n, absValue, { decimals: 2, includeK: true })
    );
  }
  return String(formatAmountWithThreshold(value, 5));
}

export interface FormatPercentOptions {
  showSign?: boolean;
  decimals?: number;
  fallback?: string;
}

export function formatPercent(
  value: number | null | undefined,
  options?: FormatPercentOptions,
): string {
  const { showSign = true, decimals = 2, fallback = EM_DASH } = options ?? {};

  if (value == null) return fallback;

  const formatted = formatPercentage(value, decimals);
  return showSign ? formatted : formatted.replace(/^[+-]/, '');
}

/** Trade timestamps from the social API may be in seconds or milliseconds. */
function tradeTimestampToMs(timestamp: number): number {
  return timestamp < 1e12 ? timestamp * 1000 : timestamp;
}

/**
 * Trade timestamps from the social API may be seconds or milliseconds.
 * Delegates to the shared `toDateFormat` so we render the same short
 * convention used by the activity list (e.g. `Jun 16 at 11:38 am`).
 */
export function formatTradeDate(timestamp: number): string {
  return toDateFormat(tradeTimestampToMs(timestamp));
}

/**
 * Time-only label for trade rows when the day is shown in a section header
 * (e.g. `8:27 pm`). Matches the clock portion of `toDateFormat`.
 */
export function formatTradeTime(timestamp: number): string {
  const date = new Date(tradeTimestampToMs(timestamp));
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours %= 12;
  hours = hours || 12;
  const minutesStr = minutes < 10 ? `0${minutes}` : String(minutes);
  return `${hours}:${minutesStr} ${ampm}`;
}

/**
 * Stable per-day key (local `YYYY-MM-DD`) for grouping trades into day sections.
 * Trades on the same calendar day share a key.
 */
export function getTradeDayKey(timestamp: number): string {
  return formatTimestampToYYYYMMDD(tradeTimestampToMs(timestamp));
}

/**
 * Day label for the trades-list section header, e.g. `Jan 1 2026`. Month names
 * are localized via the shared `date.months.*` strings.
 */
export function formatTradeDayLabel(timestamp: number): string {
  const date = new Date(tradeTimestampToMs(timestamp));
  const month = strings(`date.months.${date.getMonth()}`);
  return `${month} ${date.getDate()} ${date.getFullYear()}`;
}
