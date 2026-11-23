import type { NetworkTier } from './types';

let snapshot: NetworkTier | null = null;

/** Last transport tier for reads outside render. See the deviceCapability README for when it is `null`. */
export function getNetworkTierSnapshot(): NetworkTier | null {
  return snapshot;
}

/** Called only by the NetInfo listener in `latencyStore`, never by feature code. */
export function updateNetworkTierSnapshot(tier: NetworkTier | null): void {
  snapshot = tier;
}
