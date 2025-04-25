import { Duration } from 'luxon';

/**
 * Formats an ISO8601 duration string into a display-friendly format
 * @param isoDuration - The ISO8601 duration string to format
 * @returns A display-friendly duration string (e.g., '1d', '2w', '3m', '1y')
 */
export const formatDurationForDisplay = (isoDuration: string): string => {
  const duration = Duration.fromISO(isoDuration);
  const years = duration.years;
  const months = duration.months;
  const weeks = duration.weeks;
  const days = duration.days;

  if (years > 0) return `${years}Y`;
  if (months > 0) return `${months}M`;
  if (weeks > 0) return `${weeks}W`;
  return `${days}D`;
};

/**
 * Sorts an array of ISO8601 duration strings by their duration length
 * @param durations - Array of ISO8601 duration strings to sort
 * @returns Sorted array of ISO8601 duration strings
 */
export const sortDurationsByLength = (durations: string[]): string[] =>
  [...durations].sort((a, b) => {
    const durationA = Duration.fromISO(a);
    const durationB = Duration.fromISO(b);
    return durationA.as('milliseconds') - durationB.as('milliseconds');
  });
