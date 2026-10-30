import { DAY, HOUR, MINUTE } from '../../../../constants/time';
import { strings } from '../../../../../locales/i18n';
import { tradeTimestampToMs } from './tradeTimestamp';

/**
 * Compact social time.
 *
 * One unit vocabulary for every relative age and elapsed hold in the social
 * feature. Units are locale strings (`social_leaderboard.time.*`) so a
 * translation can change the suffix or the "ago" word without a code change.
 *
 * Unit set: Just now, s, m, h, d, w, mo, y.
 * No space between a count and its unit. Two-unit holds join with one space
 * (`33d 6h`). Relative ages append the localized "ago" word (`4h ago`).
 *
 * Ages use a single unit:
 * - under a minute, including a timestamp slightly in the future: Just now
 * - under an hour: minutes
 * - under a day: hours
 * - under 60 days: days (`11d ago` stays days)
 * - under 90 days: weeks
 * - under a year: 30-day months
 * - otherwise: years
 *
 * Holds use the same boundaries and up to two units. The second unit is the
 * leftover hours under 60 days, leftover days from 60 days to a year, and
 * leftover months after that. Under a day a hold is one unit, so `8h 13m`
 * reads `8h`. Under a minute rounds up to `1m`.
 *
 * Seconds are part of the unit set for an explicit second count (the
 * onboarding live-activity sample). Feed ages do not tick every second, so
 * anything under a minute stays "Just now" rather than `45s ago`.
 *
 * `formatHoldDuration` in `formatters.ts` is a separate helper. Token details
 * still calls it, and its English output is intentionally unchanged.
 */

const WEEK_START_DAYS = 60;
const MONTH_START_DAYS = 90;
const YEAR_START_DAYS = 365;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** Same glyph `formatters.ts` uses when a number is missing. */
const EMPTY_DURATION = '\u2014';

type SocialTimeUnit =
  | 'seconds'
  | 'minutes'
  | 'hours'
  | 'days'
  | 'weeks'
  | 'months'
  | 'years';

/**
 * One compact unit, with no "ago" suffix (`4h`, `11d`).
 *
 * @param unit - Locale unit key under `social_leaderboard.time`.
 * @param count - Whole count. Callers floor before passing.
 * @returns Localized `{count}{unit}`.
 */
export function formatSocialUnit(unit: SocialTimeUnit, count: number): string {
  return strings(`social_leaderboard.time.${unit}`, {
    count: Math.floor(count),
  });
}

/**
 * Localized "ago" wrapper (`4h ago`).
 *
 * @param duration - Already compact unit string.
 * @returns Localized relative phrase.
 */
export function formatSocialAgo(duration: string): string {
  return strings('social_leaderboard.time.ago', { duration });
}

const joinUnits = (primary: string, secondary: string | null): string => {
  if (!secondary) {
    return primary;
  }
  return strings('social_leaderboard.time.compound', { primary, secondary });
};

/**
 * Elapsed hold (`33d 6h`, `8h`, `45m`). Non-positive and non-finite spans
 * render an em dash.
 *
 * @param durationMs - Span in milliseconds.
 * @returns Compact hold label.
 */
export function formatSocialElapsed(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return EMPTY_DURATION;
  }

  const totalMinutes = Math.floor(durationMs / MINUTE);
  if (totalMinutes < 1) {
    return formatSocialUnit('minutes', 1);
  }

  const totalHours = Math.floor(durationMs / HOUR);
  const totalDays = Math.floor(durationMs / DAY);

  if (totalDays >= YEAR_START_DAYS) {
    const years = Math.floor(totalDays / DAYS_PER_YEAR);
    const months = Math.floor((totalDays % DAYS_PER_YEAR) / DAYS_PER_MONTH);
    return joinUnits(
      formatSocialUnit('years', years),
      months > 0 ? formatSocialUnit('months', months) : null,
    );
  }

  if (totalDays >= MONTH_START_DAYS) {
    const months = Math.floor(totalDays / DAYS_PER_MONTH);
    const days = totalDays % DAYS_PER_MONTH;
    return joinUnits(
      formatSocialUnit('months', months),
      days > 0 ? formatSocialUnit('days', days) : null,
    );
  }

  if (totalDays >= WEEK_START_DAYS) {
    const weeks = Math.floor(totalDays / DAYS_PER_WEEK);
    const days = totalDays % DAYS_PER_WEEK;
    return joinUnits(
      formatSocialUnit('weeks', weeks),
      days > 0 ? formatSocialUnit('days', days) : null,
    );
  }

  if (totalDays >= 1) {
    const hours = Math.floor((durationMs % DAY) / HOUR);
    return joinUnits(
      formatSocialUnit('days', totalDays),
      hours > 0 ? formatSocialUnit('hours', hours) : null,
    );
  }

  if (totalHours >= 1) {
    return formatSocialUnit('hours', totalHours);
  }

  return formatSocialUnit('minutes', totalMinutes);
}

const formatAgeDuration = (diffMs: number): string => {
  const days = Math.floor(diffMs / DAY);
  if (days >= YEAR_START_DAYS) {
    return formatSocialUnit('years', Math.floor(days / DAYS_PER_YEAR));
  }
  if (days >= MONTH_START_DAYS) {
    return formatSocialUnit('months', Math.floor(days / DAYS_PER_MONTH));
  }
  if (days >= WEEK_START_DAYS) {
    return formatSocialUnit('weeks', Math.floor(days / DAYS_PER_WEEK));
  }
  if (days >= 1) {
    return formatSocialUnit('days', days);
  }

  const hours = Math.floor(diffMs / HOUR);
  if (hours >= 1) {
    return formatSocialUnit('hours', hours);
  }

  return formatSocialUnit('minutes', Math.floor(diffMs / MINUTE));
};

/**
 * Relative age of a trade or profile timestamp (`4h ago`, `11d ago`, `Just now`).
 *
 * Accepts seconds or milliseconds. A timestamp in the future, or less than a
 * minute old, is "Just now".
 *
 * @param timestamp - Unix seconds or milliseconds.
 * @param now - Wall clock in milliseconds.
 * @returns Compact relative age.
 */
export function formatSocialRelativeAge(
  timestamp: number,
  now: number = Date.now(),
): string {
  const diff = now - tradeTimestampToMs(timestamp);
  if (!Number.isFinite(diff) || diff < MINUTE) {
    return strings('social_leaderboard.feed.just_now');
  }
  return formatSocialAgo(formatAgeDuration(diff));
}

/**
 * Explicit second count (`2s ago`). Zero and non-finite counts are "Just now".
 * Feed ages do not use this; the onboarding sample does, because those rows
 * are authored as second counts rather than timestamps.
 *
 * @param seconds - Whole seconds already elapsed.
 * @returns Compact relative age.
 */
export function formatSocialSecondsAgo(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 1) {
    return strings('social_leaderboard.feed.just_now');
  }
  return formatSocialAgo(formatSocialUnit('seconds', seconds));
}
