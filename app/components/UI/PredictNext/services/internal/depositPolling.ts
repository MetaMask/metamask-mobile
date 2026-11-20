import type { NetworkTier } from '../../../../../util/deviceCapability/types';

/** Backoff schedule between deposit status polls: 2s up to 30s. */
export const DEPOSIT_POLL_DELAYS_MS: readonly number[] = [
  2_000, 4_000, 8_000, 16_000, 30_000,
];

/** Maximum duration of one polling session before stopping until the next start. */
export const DEPOSIT_POLL_MAX_DURATION_MS = 10 * 60 * 1000;

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
