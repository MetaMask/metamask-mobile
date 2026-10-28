import {
  formatPerpsFiat,
  formatPercentage,
  PRICE_RANGES_UNIVERSAL,
} from '../../Perps/utils/formatUtils';
import {
  formatAmountWithThreshold,
  localizeLargeNumber,
} from '../../../../util/number/bigint';
import { formatSubscriptNotation } from '../../../../util/number/subscriptNotation';
import { DAY, HOUR, MINUTE } from '../../../../constants/time';
import { toDateFormat, formatTimestampToYYYYMMDD } from '../../../../util/date';
import { getIntlNumberFormatter } from '../../../../util/intl';
import I18n, { strings } from '../../../../../locales/i18n';
import { formatSocialRelativeAge } from './formatSocialTime';
import { tradeTimestampToMs } from './tradeTimestamp';

/** Placeholder rendered wherever a numeric value is unavailable. */
export const EM_DASH = '\u2014';

/**
 * Whole count with locale digit grouping (e.g. `48,707`). Use for tallies such
 * as follower counts, where there is no currency, sign or decimal component.
 */
export function formatCount(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  return getIntlNumberFormatter(I18n.locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Compact whole-count for discovery cards (e.g. `65.7K`). Values under 1,000
 * stay as grouped digits via {@link formatCount}.
 */
export function formatAbbreviatedCount(
  value: number | null | undefined,
): string {
  if (value == null || !Number.isFinite(value)) {
    return EM_DASH;
  }
  const absValue = Math.abs(value);
  if (absValue < 1000) {
    return formatCount(value);
  }
  const i18n = { t: (key: string) => strings(key) };
  const sign = value < 0 ? '-' : '';
  return (
    sign + localizeLargeNumber(i18n, absValue, { decimals: 1, includeK: true })
  );
}

/** Localized `{count} follower(s)` using the compact count from the mock. */
export function formatFollowerCountLabel(
  followerCount: number | null | undefined,
): string {
  const count = followerCount ?? 0;
  return strings(
    count === 1
      ? 'social_leaderboard.trader_profile.followers_count'
      : 'social_leaderboard.trader_profile.followers_count_plural',
    { count: formatAbbreviatedCount(count) },
  );
}

/**
 * `$0.0₇5` once a price has four or more leading zeros after the decimal.
 * Returns null for anything large enough to read normally, so callers fall
 * through to ordinary currency formatting.
 */
const formatSubscriptUsd = (absoluteValue: number): string | null => {
  const subscript = formatSubscriptNotation(absoluteValue);
  return subscript ? `$${subscript}` : null;
};

/**
 * USD for social leaderboard rows/cards: match perps-style fiat (always two
 * fractional digits for whole dollars). Rewards `formatUsd`/`formatFiat` omits
 * `.00` for integers and is not a drop-in here.
 *
 * Amounts small enough to vanish at two decimals (`$0.00`) use the app's
 * subscript notation instead, so a dust figure stays legible.
 */
export function formatUsd(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  const absoluteValue = Math.abs(value);
  const subscript = formatSubscriptUsd(absoluteValue);
  if (subscript) {
    return value < 0 ? `-${subscript}` : subscript;
  }
  return (
    (value < 0 ? '-' : '') +
    formatPerpsFiat(absoluteValue, { stripTrailingZeros: false })
  );
}

/**
 * Per-unit trade price for feed sub-headers and similar copy. Uses the same
 * tiered precision as Perps ({@link PRICE_RANGES_UNIVERSAL}) and the social
 * API formatter so sub-cent assets (e.g. PUMP) don't collapse to `$0.00`, and
 * the app's subscript notation once the price is mostly leading zeros
 * (`$0.0₇5` rather than `$0.00000005`).
 */
export function formatTradeUnitPrice(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  const absoluteValue = Math.abs(value);
  return (
    formatSubscriptUsd(absoluteValue) ??
    formatPerpsFiat(absoluteValue, { ranges: PRICE_RANGES_UNIVERSAL })
  );
}

/**
 * USD with explicit sign on positives. Use for PnL where direction matters
 * (e.g. `+$0.12`, `-$1,234.56`). Zero is rendered without a sign.
 */
export function formatSignedUsd(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  if (value === 0) return formatPerpsFiat(0, { stripTrailingZeros: false });
  const sign = value > 0 ? '+' : '-';
  const absoluteValue = Math.abs(value);
  return (
    sign +
    (formatSubscriptUsd(absoluteValue) ??
      formatPerpsFiat(absoluteValue, { stripTrailingZeros: false }))
  );
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

/**
 * Unsigned full USD with thousands separators and no fractional digits
 * (e.g. `$7,100`). Used when color, not a +/- prefix, carries the sign.
 */
export function formatUnsignedFullUsdNoDecimals(
  value: number | null | undefined,
): string {
  if (value == null) return EM_DASH;
  return formatPerpsFiat(Math.abs(value), {
    minimumDecimals: 0,
    maximumDecimals: 0,
  });
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
  const absoluteValue = Math.abs(value);
  // A dust P&L abbreviates to `$0.00`. The subscript keeps the real magnitude.
  const subscript = formatSubscriptUsd(absoluteValue);
  if (subscript) {
    return sign + subscript;
  }
  return sign + shortenAbsCurrency(absoluteValue);
}

/**
 * Unsigned USD with K/M/B/T abbreviation for ≥$1K values and two decimals below
 * that (e.g. `$137.28`, `$1.1K`, `$10.3K`). Use for compact monetary labels
 * like a trade's size where no +/- direction applies.
 */
export function formatAbbreviatedUsd(value: number | null | undefined): string {
  if (value == null) return EM_DASH;
  const absoluteValue = Math.abs(value);
  return formatSubscriptUsd(absoluteValue) ?? shortenAbsCurrency(absoluteValue);
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

/**
 * Relative age of a V0 feed row. Same compact format as
 * {@link formatFeedPostAge} (`4h ago`, `11d ago`, `Just now`).
 *
 * @param timestamp - Unix seconds or milliseconds.
 * @param now - Wall clock in milliseconds.
 * @returns Compact relative age.
 */
export function formatFeedTimestamp(
  timestamp: number,
  now: number = Date.now(),
): string {
  return formatSocialRelativeAge(timestamp, now);
}

/**
 * Duration a position was held (e.g. `1d 20h`, `8h`, `45m`).
 *
 * Social surfaces use `formatSocialElapsed` instead, so a translation can own
 * the unit glyphs. This helper stays hardcoded because token details also
 * calls it, and that copy is outside the social format.
 *
 * Multi-day holds carry their remaining hours, because `1d` alone reads the
 * same for 24 hours and 47. Below a day one unit is enough. A whole number of
 * days drops the hours rather than padding `6d 0h`. Sub-minute holds round up
 * to `1m`.
 */
export function formatHoldDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return EM_DASH;
  }

  if (durationMs >= DAY) {
    const days = Math.floor(durationMs / DAY);
    const hours = Math.floor((durationMs % DAY) / HOUR);
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  }

  if (durationMs >= HOUR) {
    return `${Math.floor(durationMs / HOUR)}h`;
  }

  return `${Math.max(1, Math.floor(durationMs / MINUTE))}m`;
}

/**
 * Relative age of a Social V1 post, closed position, or chart level.
 * Delegates to {@link formatSocialRelativeAge} so it matches the V0 row.
 *
 * @param timestamp - Unix seconds or milliseconds.
 * @param now - Wall clock in milliseconds.
 * @returns Compact relative age.
 */
export function formatFeedPostAge(
  timestamp: number,
  now: number = Date.now(),
): string {
  return formatSocialRelativeAge(timestamp, now);
}
