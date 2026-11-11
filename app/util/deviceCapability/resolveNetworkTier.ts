import type { LatencyBucket, NetworkTier } from './types';

export interface ResolvedNetworkTier {
  tier: NetworkTier | null;
  latency: LatencyBucket;
}

/**
 * Folds measured latency into the NetInfo transport tier. Offline wins and
 * hides latency; measured `slow` forces `SLOW_CELLULAR` on every other transport,
 * including an unknown (`null`) one.
 */
export function resolveNetworkTier(
  transportTier: NetworkTier | null,
  latency: LatencyBucket,
): ResolvedNetworkTier {
  if (transportTier === 'NONE') {
    return { tier: 'NONE', latency: 'unknown' };
  }
  if (latency === 'slow') {
    return { tier: 'SLOW_CELLULAR', latency };
  }
  return { tier: transportTier, latency };
}
