import type { NetworkTier } from '../../../../util/deviceCapability/types';

/** Delays between receipt reads of an in-progress Withdrawal, in
 * milliseconds. Stripe payouts take minutes, so the last delay repeats and
 * the UI never implies a fast completion. */
export const WITHDRAW_OBSERVATION_DELAYS_MS: readonly number[] = [
  2_000, 4_000, 8_000, 15_000,
];

/** Each backoff step is doubled on a slow cellular connection, to spare the
 * radio. */
export const SLOW_CELLULAR_DELAY_MULTIPLIER = 2;

/**
 * The delay before the next receipt read: one step further into the backoff
 * for every completed read, with the last step repeating, and doubled when
 * the connection is slow cellular.
 */
export const withdrawReadDelayMs = (
  attempt: number,
  networkTier: NetworkTier | null,
): number => {
  const step =
    WITHDRAW_OBSERVATION_DELAYS_MS[
      Math.min(attempt, WITHDRAW_OBSERVATION_DELAYS_MS.length - 1)
    ];
  return networkTier === 'SLOW_CELLULAR'
    ? step * SLOW_CELLULAR_DELAY_MULTIPLIER
    : step;
};
