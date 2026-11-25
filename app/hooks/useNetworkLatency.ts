import { useSyncExternalStore } from 'react';
import {
  getLatencySnapshot,
  getSettledLatencySnapshot,
  subscribeLatency,
} from '../util/deviceCapability/latencyStore';
import { subscribeDeviceCapabilityOverride } from '../util/deviceCapability/override';
import type { LatencyBucket } from '../util/deviceCapability/types';

function subscribe(listener: () => void): () => void {
  const unsubscribeLatency = subscribeLatency(listener);
  const unsubscribeOverride = subscribeDeviceCapabilityOverride(listener);
  return () => {
    unsubscribeLatency();
    unsubscribeOverride();
  };
}

/**
 * Measured fetch latency, independent of the transport tier. `UNKNOWN` while
 * offline or without enough samples. Re-renders only when the bucket changes,
 * so it stays separate from `useNetworkTier` to keep that hook as stable as
 * the transport.
 */
export function useNetworkLatency(): LatencyBucket {
  return useSyncExternalStore(subscribe, getLatencySnapshot);
}

/**
 * Last `OK` or `SLOW` reading, kept across app resumes and transport changes.
 * `UNKNOWN` only before the first reading or while offline.
 */
export function useSettledNetworkLatency(): LatencyBucket {
  return useSyncExternalStore(subscribe, getSettledLatencySnapshot);
}
