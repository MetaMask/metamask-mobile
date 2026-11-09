import { concat, pad, toHex } from '../utils';
import type { Caveat, DeleGatorEnvironment } from '..';

export const timestamp = 'timestamp';

/**
 * Builds a caveat struct for the TimestampEnforcer.
 *
 * @param environment - The DeleGator environment.
 * @param afterThreshold - Unix timestamp in seconds after which the delegation is valid, or 0 for no lower bound.
 * @param beforeThreshold - Unix timestamp in seconds before which the delegation is valid, or 0 for no upper bound.
 * @returns The Caveat.
 * @throws Error if a threshold is not a non-negative integer, or if the thresholds are out of order.
 */
export const timestampBuilder = (
  environment: DeleGatorEnvironment,
  afterThreshold: number,
  beforeThreshold: number,
): Caveat => {
  for (const threshold of [afterThreshold, beforeThreshold]) {
    if (!Number.isInteger(threshold) || threshold < 0) {
      throw new Error('Invalid threshold: must be a non-negative integer');
    }
  }

  if (beforeThreshold !== 0 && beforeThreshold <= afterThreshold) {
    throw new Error(
      'Invalid thresholds: beforeThreshold must be greater than afterThreshold',
    );
  }

  const terms = concat([
    pad(toHex(afterThreshold), { size: 16 }),
    pad(toHex(beforeThreshold), { size: 16 }),
  ]);

  const {
    caveatEnforcers: { TimestampEnforcer },
  } = environment;

  return {
    enforcer: TimestampEnforcer,
    terms,
    args: '0x',
  };
};
