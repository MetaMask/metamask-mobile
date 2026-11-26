import { getDeviceCapabilityOverride } from './override';
import type { NetworkTier } from './types';

let snapshot: NetworkTier | null = null;

/** Last transport tier for reads outside render, unless overridden in development. */
export function getNetworkTierSnapshot(): NetworkTier | null {
  const { network } = getDeviceCapabilityOverride();
  return network === undefined ? snapshot : network;
}

/** Called only by the NetInfo listener in `latencyStore`, never by feature code. */
export function updateNetworkTierSnapshot(tier: NetworkTier | null): void {
  snapshot = tier;
}
