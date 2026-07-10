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
