const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Formats a feed item timestamp.
 *
 * - Within the last 24 hours: compact relative time ("21s", "4m", "2h").
 * - Older than 24 hours: absolute clock time ("11:48 PM").
 *
 * @param timestamp - Epoch milliseconds the trade happened.
 * @param now - Reference "now" in epoch ms (defaults to `Date.now()`).
 * @returns The formatted time label.
 */
export const formatFeedTimestamp = (
  timestamp: number,
  now: number = Date.now(),
): string => {
  const diff = Math.max(0, now - timestamp);

  if (diff >= DAY) {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (diff < MINUTE) {
    return `${Math.floor(diff / SECOND)}s`;
  }

  if (diff < HOUR) {
    return `${Math.floor(diff / MINUTE)}m`;
  }

  return `${Math.floor(diff / HOUR)}h`;
};

/**
 * Formats the date-group header label for a feed section, e.g. "July 1, 2026".
 *
 * @param timestamp - Epoch milliseconds of any item in the group.
 * @returns The formatted date label.
 */
export const formatFeedDateLabel = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
