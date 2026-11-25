import { getDeviceCapabilityOverride } from './override';
import type { NetworkTier } from './types';

let snapshot: NetworkTier | null = null;
const listeners = new Set<() => void>();

/** Last transport tier for reads outside render, unless overridden in development. */
export function getNetworkTierSnapshot(): NetworkTier | null {
  const { network } = getDeviceCapabilityOverride();
  return network === undefined ? snapshot : network;
}

/** Called by the existing NetInfo listener. Updates the snapshot before resetting latency. */
export function updateNetworkTierSnapshot(
  tier: NetworkTier | null,
  resetLatency?: () => void,
): void {
  const changed = tier !== snapshot;
  snapshot = tier;
  resetLatency?.();
  if (changed) listeners.forEach((listener) => listener());
}

/** Subscribes to measured transport changes, without adding a NetInfo listener. */
export function subscribeNetworkTierSnapshot(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
