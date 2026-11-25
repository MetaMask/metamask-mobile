import { readHardwareTier } from './hardwareTier';
import { getLatencySnapshot, subscribeLatency } from './latencyStore';
import {
  getNetworkTierSnapshot,
  subscribeNetworkTierSnapshot,
} from './networkTierSnapshot';
import {
  getDeviceCapabilityOverride,
  subscribeDeviceCapabilityOverride,
} from './override';
import type { HardwareTier, LatencyBucket, NetworkTier } from './types';

export interface NetworkConditions {
  hardware: HardwareTier | null;
  network: NetworkTier | null;
  latency: LatencyBucket;
}

// RAM does not change during the process. Don't read the native module on every request.
let hardware: HardwareTier | null | undefined;

/** Reads the three independent signals without subscribing to a native source. */
export function getNetworkConditions(): NetworkConditions {
  const override = getDeviceCapabilityOverride().hardware;
  if (override === undefined && hardware === undefined)
    hardware = readHardwareTier();
  return {
    hardware: override === undefined ? (hardware ?? null) : override,
    network: getNetworkTierSnapshot(),
    latency: getLatencySnapshot(),
  };
}

/** Subscribes only to effective condition changes and returns a teardown. */
export function subscribeNetworkConditions(listener: () => void): () => void {
  let previous = getNetworkConditions();
  const notify = (): void => {
    const next = getNetworkConditions();
    if (
      next.hardware === previous.hardware &&
      next.network === previous.network &&
      next.latency === previous.latency
    )
      return;
    previous = next;
    listener();
  };
  const unsubscribers = [
    subscribeNetworkTierSnapshot(notify),
    subscribeLatency(notify),
    subscribeDeviceCapabilityOverride(notify),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
