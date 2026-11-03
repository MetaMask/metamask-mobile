import { getIntlNumberFormatter } from '../../../../util/intl';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

// Hermes has no narrow unit patterns
const TOKEN_AGE_UNITS = [
  { max: MINUTE, divisor: 1, unit: 'second', narrowUnit: 's' },
  { max: HOUR, divisor: MINUTE, unit: 'minute', narrowUnit: 'm' },
  { max: DAY, divisor: HOUR, unit: 'hour', narrowUnit: 'h' },
  { max: WEEK, divisor: DAY, unit: 'day', narrowUnit: 'd' },
  { max: MONTH, divisor: WEEK, unit: 'week', narrowUnit: 'w' },
  { max: YEAR, divisor: MONTH, unit: 'month', narrowUnit: 'm' },
  { max: Infinity, divisor: YEAR, unit: 'year', narrowUnit: 'y' },
] as const;

const getTokenAge = (
  ageInSeconds: number,
  locale?: string | string[],
): string => {
  const { divisor, narrowUnit } =
    TOKEN_AGE_UNITS.find(({ max }) => ageInSeconds < max) ?? TOKEN_AGE_UNITS[6];
  const value = Math.floor(ageInSeconds / divisor);
  const resolvedLocale = (Array.isArray(locale) ? locale[0] : locale) || 'en';
  return `${getIntlNumberFormatter(resolvedLocale).format(value)}${narrowUnit}`;
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
