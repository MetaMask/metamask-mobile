import type { HardwareTier } from '../../util/deviceCapability';

const MINUTE = 60 * 1000;

// Unknown hardware keeps the app's 24 h default.
export const GC_TIME: Record<HardwareTier | 'UNKNOWN', number> = {
  LOW: 5 * MINUTE,
  MID: 60 * MINUTE,
  HIGH: 24 * 60 * MINUTE,
  UNKNOWN: 24 * 60 * MINUTE,
};

export const MAX_RETRIES = 2;
export const SLOW_CONNECTION_MAX_RETRIES = 1;
export const SLOW_CONNECTION_POLL_FACTOR = 3;

// Client errors that can succeed on a later attempt.
export const RETRYABLE_CLIENT_STATUSES = [408, 429];
