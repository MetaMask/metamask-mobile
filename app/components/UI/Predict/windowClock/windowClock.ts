/**
 * Venue-neutral clock math for a timed window (for example a 15-minute
 * Up/Down round).
 *
 * The input is a plain `{ startsAt, endsAt }` pair of ISO timestamps. It is
 * never a legacy `PredictMarket`. The functions are pure. They move here from
 * `utils/series.ts` without behaviour change; `utils/series.ts` re-exports them
 * under their old names.
 */

const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;

/**
 * Window bounds as ISO timestamps. Both fields are optional so that callers
 * with a missing value get the placeholder result instead of a throw.
 */
export interface WindowClockInput {
  startsAt?: string;
  endsAt?: string;
}

const parseTimeMs = (value?: string): number | undefined => {
  if (!value) {
    return undefined;
  }

  const timeMs = new Date(value).getTime();
  return Number.isFinite(timeMs) ? timeMs : undefined;
};

/**
 * Returns the start (ms) of the aligned window that contains `nowMs`.
 * Returns 0 for a non-positive duration or a non-finite time.
 */
export const getAlignedWindowStartMs = (
  durationMs: number,
  nowMs = Date.now(),
): number => {
  if (!Number.isFinite(nowMs) || durationMs <= 0) {
    return 0;
  }

  return Math.floor(nowMs / durationMs) * durationMs;
};

/**
 * Returns the window length in ms, or 0 when a bound is missing or invalid.
 */
export const getWindowDurationMs = ({
  startsAt,
  endsAt,
}: WindowClockInput): number => {
  const startMs = parseTimeMs(startsAt);
  const endMs = parseTimeMs(endsAt);

  if (startMs === undefined || endMs === undefined) {
    return 0;
  }

  return Math.max(0, endMs - startMs);
};

/**
 * Returns the time left until `endsAt` (never below 0), or `undefined` when
 * `endsAt` is missing or invalid.
 */
export const getWindowTimeRemainingMs = (
  { endsAt }: WindowClockInput,
  nowMs = Date.now(),
): number | undefined => {
  const endMs = parseTimeMs(endsAt);
  if (endMs === undefined) {
    return undefined;
  }

  return Math.max(0, endMs - nowMs);
};

/**
 * Formats the time left as `H:MM:SS` (one hour or more) or `M:SS`.
 * Returns `--:--` when `endsAt` is missing or invalid, and `00:00` at or after
 * the end.
 */
export const formatWindowCountdown = (
  bounds: WindowClockInput,
  nowMs = Date.now(),
): string => {
  const remainingMs = getWindowTimeRemainingMs(bounds, nowMs);
  if (typeof remainingMs !== 'number') {
    return '--:--';
  }

  if (remainingMs <= 0) {
    return '00:00';
  }

  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR);
  const minutes = Math.floor(
    (totalSeconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE,
  );
  const seconds = totalSeconds % SECONDS_PER_MINUTE;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Returns the share of the window still left, from 1 (just opened) to 0
 * (ended). The duration comes from `{ startsAt, endsAt }` unless the caller
 * passes `durationMs`. A zero duration or a missing `endsAt` gives 0.
 */
export const getWindowProgressRemaining = (
  bounds: WindowClockInput,
  nowMs = Date.now(),
  durationMs = getWindowDurationMs(bounds),
): number => {
  if (durationMs <= 0) {
    return 0;
  }

  const remainingMs = getWindowTimeRemainingMs(bounds, nowMs);
  if (typeof remainingMs !== 'number') {
    return 0;
  }

  return Math.min(remainingMs / durationMs, 1);
};
