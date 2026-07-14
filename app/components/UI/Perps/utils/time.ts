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
 * @param listedAt - Epoch milliseconds timestamp (from PerpsMarketData.listedAt)
 */
export const isWithinLast30Days = (listedAt: number): boolean =>
  Date.now() - listedAt < THIRTY_DAYS_MS;

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
