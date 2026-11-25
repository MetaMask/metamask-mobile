import type { NetworkTier } from '../../../../../util/deviceCapability/types';

/** Backoff schedule between fast deposit status polls: 2s up to 30s. */
export const DEPOSIT_POLL_DELAYS_MS: readonly number[] = [
  2_000, 4_000, 8_000, 16_000, 30_000,
];

/** Maximum duration of the fast-poll session (10 min) before stepping down to slow follow-up. */
export const DEPOSIT_POLL_MAX_DURATION_MS = 10 * 60 * 1000;
/** Slower follow-up interval (3 min) after the fast-poll cap while open deposits remain. */
export const DEPOSIT_SLOW_POLL_INTERVAL_MS = 5 * 60 * 1000;
/** Total follow-up window (60 min) before stopping slow background follow-up. */
export const DEPOSIT_SLOW_POLL_MAX_DURATION_MS = 60 * 60 * 1000;

/** Multiplier applied to each backoff step on a slow cellular connection. */
export const DEPOSIT_SLOW_NETWORK_MULTIPLIER = 2;

/**
 * Computes the delay before the next deposit poll for `attempt` and
 * `networkTier` (`app/util/deviceCapability/README.md`).
 *
 * Returns `null` for `'NONE'` (offline) so polling stops, doubles the backoff
 * step for `'SLOW_CELLULAR'` to spare the radio, and uses the default 2s to
 * 30s schedule for `'WIFI'`, `'FAST_CELLULAR'`, or `null` (unknown).
 */
export const depositPollDelayMs = (
  attempt: number,
  networkTier: NetworkTier | null,
): number | null => {
  if (networkTier === 'NONE') {
    return null;
  }
  const index = Math.max(
    0,
    Math.min(attempt, DEPOSIT_POLL_DELAYS_MS.length - 1),
  );
  const step = DEPOSIT_POLL_DELAYS_MS[index];
  return networkTier === 'SLOW_CELLULAR'
    ? step * DEPOSIT_SLOW_NETWORK_MULTIPLIER
    : step;
};

/**
 * Computes the next poll delay given `elapsedMs` since the session started.
 * Uses the fast-poll backoff while within {@link DEPOSIT_POLL_MAX_DURATION_MS},
 * then transitions to {@link DEPOSIT_SLOW_POLL_INTERVAL_MS} up to
 * {@link DEPOSIT_SLOW_POLL_MAX_DURATION_MS} so late credits (e.g. after
 * minute 10) still surface while the app stays open.
 */
export const depositNextPollDelayMs = (
  attempt: number,
  elapsedMs: number,
  networkTier: NetworkTier | null,
): number | null => {
  if (networkTier === 'NONE') {
    return null;
  }
  const fastDelay = depositPollDelayMs(attempt, networkTier);
  if (fastDelay === null) {
    return null;
  }
  const fastRemaining = DEPOSIT_POLL_MAX_DURATION_MS - elapsedMs;
  if (fastRemaining > 0 && fastDelay <= fastRemaining) {
    return fastDelay;
  }
  const slowDelay =
    networkTier === 'SLOW_CELLULAR'
      ? DEPOSIT_SLOW_POLL_INTERVAL_MS * DEPOSIT_SLOW_NETWORK_MULTIPLIER
      : DEPOSIT_SLOW_POLL_INTERVAL_MS;
  const slowRemaining = DEPOSIT_SLOW_POLL_MAX_DURATION_MS - elapsedMs;
  if (slowRemaining <= 0 || slowDelay > slowRemaining) {
    return null;
  }
  return slowDelay;
};
