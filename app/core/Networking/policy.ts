import {
  getHardwareTier,
  getNetworkTierSnapshot,
} from '../../util/deviceCapability';
import { getLatencySnapshot } from '../../util/deviceCapability/latencyStore';
import {
  GC_TIME,
  MAX_RETRIES,
  RETRYABLE_CLIENT_STATUSES,
  SLOW_CONNECTION_MAX_RETRIES,
  SLOW_CONNECTION_POLL_FACTOR,
} from './constants';
import { HttpError, InvalidResponseError, NetworkTimeoutError } from './errors';

// Read when called, so a connection change does not need a re-render.
function isSlowConnection(): boolean {
  return (
    getNetworkTierSnapshot() === 'SLOW_CELLULAR' ||
    getLatencySnapshot() === 'SLOW'
  );
}

function isRetryable(error: Error): boolean {
  if (error instanceof InvalidResponseError) return false;
  if (!(error instanceof HttpError)) return true;
  if (error.status >= 500) return true;
  return RETRYABLE_CLIENT_STATUSES.includes(error.status);
}

/** How long unused data stays in memory: shorter on devices with less RAM. */
export function resolveGcTime(): number {
  return GC_TIME[getHardwareTier() ?? 'UNKNOWN'];
}

/**
 * Same request, same answer: client errors (except 408/429) and invalid
 * bodies are not retried. Timeouts get one retry at most and none on slow links.
 * Other transient failures get two retries, or one on slow links.
 */
export function shouldRetry(failureCount: number, error: Error): boolean {
  if (!isRetryable(error)) return false;
  const slowConnection = isSlowConnection();
  if (error instanceof NetworkTimeoutError) {
    return !slowConnection && failureCount === 0;
  }
  if (slowConnection) return failureCount < SLOW_CONNECTION_MAX_RETRIES;
  return failureCount < MAX_RETRIES;
}

/** No interval means no polling; a slow connection polls less often. */
export function resolvePollInterval(
  interval: number | undefined,
): number | false {
  if (interval === undefined) return false;
  if (isSlowConnection()) return interval * SLOW_CONNECTION_POLL_FACTOR;
  return interval;
}
