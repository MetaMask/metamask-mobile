import { readHardwareTier } from './hardwareTier';
import { getLatencySnapshot } from './latencyStore';
import { getNetworkTierSnapshot } from './networkTierSnapshot';
import { getDeviceCapabilityOverride } from './override';
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
