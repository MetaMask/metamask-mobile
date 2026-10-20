const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const TOKEN_AGE_UNITS = [
  { max: MINUTE, divisor: 1, unit: 'second' },
  { max: HOUR, divisor: MINUTE, unit: 'minute' },
  { max: DAY, divisor: HOUR, unit: 'hour' },
  { max: WEEK, divisor: DAY, unit: 'day' },
  { max: MONTH, divisor: WEEK, unit: 'week' },
  { max: YEAR, divisor: MONTH, unit: 'month' },
  { max: Infinity, divisor: YEAR, unit: 'year' },
] as const;

const getTokenAge = (
  ageInSeconds: number,
  locale?: string | string[],
): string => {
  const { divisor, unit } =
    TOKEN_AGE_UNITS.find(({ max }) => ageInSeconds < max) ?? TOKEN_AGE_UNITS[6];
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit,
    unitDisplay: 'narrow',
  }).format(Math.floor(ageInSeconds / divisor));
};

/**
 * Formats a Unix epoch timestamp (seconds) into a compact, locale-aware age
 * label suitable for the token age chip, e.g. "5s", "3m", "2h", "3d", "1w".
 *
 * Returns `null` when the timestamp is absent or in the future.
 */
export const formatTokenAge = (
  launchedAtSeconds: number | null | undefined,
  locale?: string | string[],
): string | null => {
  if (launchedAtSeconds == null || launchedAtSeconds <= 0) {
    return null;
  }

  const nowSeconds = Date.now() / 1000;
  const elapsed = nowSeconds - launchedAtSeconds;

  if (elapsed < 0) {
    return null;
  }

  return getTokenAge(elapsed, locale);
};
