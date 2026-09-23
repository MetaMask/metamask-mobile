import { strings } from '../../../../../../locales/i18n';

const MILLISECONDS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR;

interface DurationParts {
  unit: 'days' | 'hours' | 'minutes';
  count: number;
}

/**
 * Breaks a time span into the largest whole unit that fits, so a 1-hour
 * window reads as hours rather than "0 days". Minutes are rounded up so a
 * partial minute still counts.
 *
 * @param fromIso - The start of the span.
 * @param toIso - The end of the span.
 * @returns The unit and count, clamped to zero minutes for a negative or
 * unparsable span.
 */
function getDurationParts(fromIso: string, toIso: string): DurationParts {
  const from = Date.parse(fromIso);
  const to = Date.parse(toIso);

  if (Number.isNaN(from) || Number.isNaN(to)) {
    return { unit: 'minutes', count: 0 };
  }

  const totalMinutes = Math.max(
    0,
    Math.ceil((to - from) / MILLISECONDS_PER_MINUTE),
  );

  if (totalMinutes >= MINUTES_PER_DAY) {
    return { unit: 'days', count: Math.floor(totalMinutes / MINUTES_PER_DAY) };
  }

  if (totalMinutes >= MINUTES_PER_HOUR) {
    return {
      unit: 'hours',
      count: Math.floor(totalMinutes / MINUTES_PER_HOUR),
    };
  }

  return { unit: 'minutes', count: totalMinutes };
}

const DURATION_STRING_KEYS: Record<DurationParts['unit'], string> = {
  days: 'bridge.limit.duration_days',
  hours: 'bridge.limit.duration_hours',
  minutes: 'bridge.limit.duration_minutes',
};

const TIME_LEFT_STRING_KEYS: Record<DurationParts['unit'], string> = {
  days: 'bridge.limit.days_left',
  hours: 'bridge.limit.hours_left',
  minutes: 'bridge.limit.minutes_left',
};

/**
 * Formats how long an order was open for before it expired, e.g. "3d",
 * "1h" or "10m".
 *
 * @param createdAt - The order's `createdAt` timestamp.
 * @param expiresAt - The order's `expiresAt` timestamp.
 * @returns A localized duration string.
 */
export function formatLimitOrderExpiredDuration(
  createdAt: string,
  expiresAt: string,
): string {
  const { unit, count } = getDurationParts(createdAt, expiresAt);

  return strings(DURATION_STRING_KEYS[unit], { count });
}

/**
 * Formats the time remaining until an order expires, e.g. "4d left",
 * "1h left" or "10m left".
 *
 * @param expiresAt - The order's `expiresAt` timestamp.
 * @param now - The current time. Defaults to `new Date()`; overridable for tests.
 * @returns A localized "time left" string.
 */
export function formatLimitOrderTimeLeft(
  expiresAt: string,
  now: Date = new Date(),
): string {
  const { unit, count } = getDurationParts(now.toISOString(), expiresAt);

  return strings(TIME_LEFT_STRING_KEYS[unit], { count });
}
