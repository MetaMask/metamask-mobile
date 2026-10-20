const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

/**
 * Formats a Unix epoch timestamp (seconds) into a compact age label
 * suitable for the token age chip, e.g. "5m", "3h", "2d", "1w", "6mo", "1y".
 *
 * Returns `null` when the timestamp is absent or in the future.
 */
export const formatTokenAge = (
  launchedAtSeconds: number | null | undefined,
): string | null => {
  if (launchedAtSeconds == null || launchedAtSeconds <= 0) {
    return null;
  }

  const nowSeconds = Date.now() / 1000;
  const elapsed = nowSeconds - launchedAtSeconds;

  if (elapsed < 0) {
    return null;
  }

  if (elapsed < MINUTE) {
    return `${Math.floor(elapsed)}s`;
  }
  if (elapsed < HOUR) {
    return `${Math.floor(elapsed / MINUTE)}m`;
  }
  if (elapsed < DAY) {
    return `${Math.floor(elapsed / HOUR)}h`;
  }
  if (elapsed < WEEK) {
    return `${Math.floor(elapsed / DAY)}d`;
  }
  if (elapsed < MONTH) {
    return `${Math.floor(elapsed / WEEK)}w`;
  }
  if (elapsed < YEAR) {
    return `${Math.floor(elapsed / MONTH)}mo`;
  }
  return `${Math.floor(elapsed / YEAR)}y`;
};
