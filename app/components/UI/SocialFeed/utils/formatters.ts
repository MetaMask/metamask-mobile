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
  const rounded = Math.round(value);
  if (rounded === 0) {
    return formatPerpsFiat(0, { minimumDecimals: 0, maximumDecimals: 0 });
  }
  const sign = rounded > 0 ? '+' : '-';
  return (
    sign +
    formatPerpsFiat(Math.abs(rounded), {
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
 * Formats a feed item timestamp.
 *
 * - Within the last minute: "Just now".
 * - Within the last 24 hours: compact relative time ("4m", "2h").
 * - Older than 24 hours: absolute clock time via `formatTradeTime` (e.g. `8:27 pm`).
 *
 * The whole sub-minute range collapses to one label because a second-by-second
 * age reads as stale unless it ticks live, and this feed is a paginated snapshot
 * rather than a stream. It also absorbs timestamps slightly in the future (clock
 * skew), which are genuinely "now".
 *
 * Uses manual formatting (not `toLocaleTimeString`) so output is deterministic on
 * Hermes, which ignores locale options and falls back to strings like
 * "02:16:21 GMT+0100".
 */
export function formatFeedTimestamp(
  timestamp: number,
  now: number = Date.now(),
): string {
  const ms = tradeTimestampToMs(timestamp);
  const diff = now - ms;

  if (diff >= DAY) {
    return formatTradeTime(timestamp);
  }

  if (diff < MINUTE) {
    return strings('social_leaderboard.feed.just_now');
  }

  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)}m`;
  }

  return `${Math.floor(diff / HOUR)}h`;
}

/**
 * Duration a position was held, derived from its fills (e.g. `1d 20h`, `8h`,
 * `45m`).
 *
 * Multi-day holds carry their remaining hours, because `1d` alone reads the
 * same for 24 hours and 47. Below a day one unit is enough -- the card gives
 * this a single right-aligned slot, and nobody needs `8h 13m`. A whole number
 * of days drops the hours rather than padding `6d 0h`.
 *
 * Sub-minute holds round up to `1m` rather than reading `0m`.
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

/** Days stay the unit through 59 days. 60 days is the first week label. */
const POST_AGE_WEEK_AFTER_DAYS = 60;
/** Weeks stay the unit through 89 days. 90 days is the first month label. */
const POST_AGE_MONTH_AFTER_DAYS = 90;
const POST_AGE_YEAR_AFTER_DAYS = 365;
const POST_AGE_DAYS_PER_WEEK = 7;
/** Months are counted in 30-day blocks, so 90 days is `3mo ago`. */
const POST_AGE_DAYS_PER_MONTH = 30;
const POST_AGE_DAYS_PER_YEAR = 365;

/**
 * Compact post age (e.g. `40m ago`, `8w ago`).
 *
 * - Under a minute, including a timestamp slightly in the future: "Just now".
 * - Under an hour: `Nm ago`.
 * - Under a day: `Nh ago`.
 * - Under 60 days: `Nd ago`.
 * - Under 90 days: `Nw ago`. 60 days is `8w ago`.
 * - Under 365 days: `Nmo ago`, in 30-day months. 90 days is `3mo ago`.
 * - 365 days and up: `Ny ago`, in 365-day years.
 *
 * Counts are floored. Ages of a day or more stay relative.
 */
export function formatFeedPostAge(
  timestamp: number,
  now: number = Date.now(),
): string {
  const diff = now - tradeTimestampToMs(timestamp);

  if (diff < MINUTE) {
    return strings('social_leaderboard.feed.just_now');
  }

  if (diff < HOUR) {
    return strings('social_leaderboard.feed.age.minutes', {
      count: Math.floor(diff / MINUTE),
    });
  }

  if (diff < DAY) {
    return strings('social_leaderboard.feed.age.hours', {
      count: Math.floor(diff / HOUR),
    });
  }

  const days = Math.floor(diff / DAY);

  if (days < POST_AGE_WEEK_AFTER_DAYS) {
    return strings('social_leaderboard.feed.age.days', { count: days });
  }

  if (days < POST_AGE_MONTH_AFTER_DAYS) {
    return strings('social_leaderboard.feed.age.weeks', {
      count: Math.floor(days / POST_AGE_DAYS_PER_WEEK),
    });
  }

  if (days < POST_AGE_YEAR_AFTER_DAYS) {
    return strings('social_leaderboard.feed.age.months', {
      count: Math.floor(days / POST_AGE_DAYS_PER_MONTH),
    });
  }

  return strings('social_leaderboard.feed.age.years', {
    count: Math.floor(days / POST_AGE_DAYS_PER_YEAR),
  });
}
