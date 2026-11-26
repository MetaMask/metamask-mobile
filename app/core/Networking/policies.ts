import { calculateRetryDelay } from '@metamask/core-backend';
import { isCancelledError } from '@tanstack/react-query';
import { StructError } from '@metamask/superstruct';
import type { NetworkConditions } from '../../util/deviceCapability/conditions';
import { LATENCY_THRESHOLDS } from '../../util/deviceCapability/thresholds';
import {
  HttpError,
  OfflineError,
  ParseError,
  isRetryableStatus,
} from './errors';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DEFAULT_TIMEOUT = 15 * SECOND;
const MAX_RETRY_AFTER = 60 * SECOND;

export const STALE_TIMES = {
  realtime: 0,
  live: 30 * SECOND,
  standard: 5 * MINUTE,
  static: HOUR,
} as const;
export type Freshness = keyof typeof STALE_TIMES;
export type PollProfile = 'realtime' | 'frequent' | 'background' | 'manual';

function isSlow({ network, latency }: NetworkConditions): boolean {
  return network === 'SLOW_CELLULAR' || latency === 'SLOW';
}

/** Returns the request time budget for this hardware tier. */
export function resolveTimeout(
  conditions: NetworkConditions,
  enabled: boolean,
): number {
  return enabled && conditions.hardware
    ? LATENCY_THRESHOLDS[conditions.hardware].hungMs
    : DEFAULT_TIMEOUT;
}

/** Returns how long an unobserved query should stay in memory. */
export function resolveGcTime(
  { hardware }: NetworkConditions,
  enabled: boolean,
): number {
  if (!enabled) return 24 * HOUR;
  if (hardware === 'LOW') return 5 * MINUTE;
  if (hardware === 'MID') return HOUR;
  return 24 * HOUR;
}

/** Returns false for profiles that should not poll on this connection. */
export function resolvePoll(
  profile: PollProfile,
  conditions: NetworkConditions,
  enabled: boolean,
): number | false {
  if (profile === 'manual') return false;
  if (profile === 'background')
    return enabled && isSlow(conditions) ? false : 5 * MINUTE;
  const base = profile === 'realtime' ? 5 * SECOND : 30 * SECOND;
  if (!enabled) return base;
  const transport = conditions.network === 'SLOW_CELLULAR' ? 3 : 1;
  const latency = conditions.latency === 'SLOW' ? 2 : 1;
  const hardware =
    profile === 'realtime' && conditions.hardware === 'LOW' ? 2 : 1;
  return base * Math.min(4, transport * latency * hardware);
}

/** Identifies failures that must not be retried, including generated API errors. */
export function isRetryableError(error: unknown): boolean {
  if (
    isCancelledError(error) ||
    error instanceof OfflineError ||
    error instanceof ParseError ||
    error instanceof StructError ||
    (error instanceof Error && error.name === 'AbortError')
  )
    return false;
  if (
    error instanceof Error &&
    'status' in error &&
    typeof error.status === 'number'
  ) {
    return (
      isRetryableStatus(error.status) &&
      !(
        error instanceof HttpError &&
        error.status === 429 &&
        (error.retryAfterMs ?? 0) > MAX_RETRY_AFTER
      )
    );
  }
  return true;
}

/** TanStack supplies a zero-based failure index before retrying. */
export function shouldRetryQuery(
  failureIndex: number,
  error: unknown,
  conditions: NetworkConditions,
  enabled: boolean,
): boolean {
  return (
    failureIndex < (enabled && isSlow(conditions) ? 1 : 2) &&
    isRetryableError(error)
  );
}

/** Computes jittered query backoff and honours HTTP 429 Retry-After. */
export function resolveRetryDelay(
  failureIndex: number,
  error: unknown,
  conditions: NetworkConditions,
  enabled: boolean,
): number {
  const maximum = Math.min(
    (isSlow(conditions) ? 2 : 1) * SECOND * 2 ** failureIndex,
    30 * SECOND,
  );
  const backoff = enabled
    ? (maximum / 2) * (1 + Math.random())
    : calculateRetryDelay(failureIndex);
  return error instanceof HttpError && error.status === 429
    ? Math.max(backoff, error.retryAfterMs ?? 0)
    : backoff;
}
