// @ts-expect-error - humanize-duration is not typed
import humanizeDuration from 'humanize-duration';

const shortEnglishHumanizer = humanizeDuration.humanizer({
  language: 'shortEn',
  languages: {
    shortEn: {
      h: (unitCount: number) => (unitCount === 1 ? 'hour' : 'hours'),
      m: (unitCount: number) => (unitCount === 1 ? 'minute' : 'minutes'),
      s: (unitCount: number) => (unitCount === 1 ? 'second' : 'seconds'),
    },
  },
});

/**
 * Formats a duration in seconds into a human-readable string using the most appropriate unit.
 *
 * The function automatically selects the largest suitable unit (hours, minutes, or seconds)
 * and rounds to the nearest whole number for cleaner display.
 *
 * @param seconds - The duration in seconds to format
 * @returns A formatted string with the appropriate unit (e.g., "30 sec", "2 min", "1 hr")
 *
 * @example
 * formatDurationForDisplay(30)    // "30 seconds"
 * formatDurationForDisplay(90)    // "2 minutes" (rounds 1.5 to 2)
 * formatDurationForDisplay(3600)  // "1 hour"
 * formatDurationForDisplay(5400)  // "2 hours" (rounds 1.5 to 2)
 */
export const formatDurationForDisplay = (seconds: number): string => {
  const milliseconds = seconds * 1000;

  const options = {
    units: ['h', 'm', 's'] as const,
    round: true,
    spacer: ' ',
    largest: 1, // Show only the largest appropriate unit
    maxDecimalPoints: 1,
  };

  return shortEnglishHumanizer(milliseconds, options);
};

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Returns true when the given epoch-ms timestamp falls within the last 30 days.
 *
 * `now` must be passed explicitly (rather than read internally via `Date.now()`)
 * so callers control staleness: a memoized result only changes when `now`
 * changes, e.g. on screen focus (see `useNowOnScreenFocus`), instead of silently
 * going stale while a screen stays mounted.
 *
 * A `listedAt` at or after `now` is treated as not-recent (excludes the exact
 * boundary and any clock-skewed future timestamp) rather than qualifying via a
 * negative age.
 *
 * @param listedAt - Epoch milliseconds timestamp (from PerpsMarketData.listedAt)
 * @param now - Current time in epoch milliseconds
 */
export const isWithinLast30Days = (listedAt: number, now: number): boolean => {
  const age = now - listedAt;
  return age > 0 && age < THIRTY_DAYS_MS;
};

/**
 * Returns true when a market was listed within the last 30 days. Shared by the
 * "Recently added" home rail, the "New" market-list filter, and the "New" badge
 * so all three surfaces agree on the same criterion.
 *
 * @param listedAt - Epoch milliseconds timestamp (from PerpsMarketData.listedAt), if known
 * @param now - Current time in epoch milliseconds
 */
export const isRecentlyListed = (
  listedAt: number | undefined,
  now: number,
): boolean => listedAt !== undefined && isWithinLast30Days(listedAt, now);

/**
 * Formats the time elapsed since a market was listed as a compact relative label.
 * Used on the "Recently added" rail tiles.
 *
 * @param listedAt - Epoch milliseconds timestamp (from PerpsMarketData.listedAt)
 * @returns e.g. "3h ago", "1 day ago", "12 days ago"
 *
 * @example
 * formatTimeSinceListing(Date.now() - 3 * 60 * 60 * 1000)  // "3h ago"
 * formatTimeSinceListing(Date.now() - 24 * 60 * 60 * 1000) // "1 day ago"
 * formatTimeSinceListing(Date.now() - 5 * 24 * 60 * 60 * 1000) // "5 days ago"
 */
export const formatTimeSinceListing = (listedAt: number): string => {
  const elapsed = Date.now() - listedAt;

  if (elapsed < ONE_DAY_MS) {
    const hours = Math.floor(elapsed / ONE_HOUR_MS);
    return `${Math.max(hours, 1)}h ago`;
  }

  const days = Math.floor(elapsed / ONE_DAY_MS);
  return days === 1 ? '1 day ago' : `${days} days ago`;
};
