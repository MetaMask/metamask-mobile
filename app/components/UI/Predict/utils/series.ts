const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_DAY = 86400;
const SECONDS_PER_WEEK = 604800;

const RECURRENCE_MAP: Record<string, number> = {
  '5m': 5 * SECONDS_PER_MINUTE,
  '15m': 15 * SECONDS_PER_MINUTE,
  '30m': 30 * SECONDS_PER_MINUTE,
  '1h': SECONDS_PER_HOUR,
  hourly: SECONDS_PER_HOUR,
  daily: SECONDS_PER_DAY,
  weekly: SECONDS_PER_WEEK,
};

export function parseRecurrenceToSeconds(recurrence: string): number {
  return RECURRENCE_MAP[recurrence.toLowerCase()] ?? 0;
}

export const SERIES_PAST_WINDOW_MS = 30 * 60 * 60 * 1000;
export const SERIES_FUTURE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const SERIES_MAX_EVENTS = 50;
