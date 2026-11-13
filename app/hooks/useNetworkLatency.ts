import { useSyncExternalStore } from 'react';
import {
  getLatencySnapshot,
  subscribeLatency,
} from '../util/deviceCapability/latencyStore';
import type { LatencyBucket } from '../util/deviceCapability/types';

/**
 * Measured fetch latency, independent of the transport tier. `UNKNOWN` while
 * offline or without enough samples. Re-renders only when the bucket changes,
 * so it stays separate from `useNetworkTier` to keep that hook as stable as
 * the transport.
 */
export function useNetworkLatency(): LatencyBucket {
  return useSyncExternalStore(subscribeLatency, getLatencySnapshot);
}
