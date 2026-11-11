import { useSyncExternalStore } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  computeNetworkTier,
  readCellularGeneration,
} from '../util/deviceCapability/computeNetworkTier';
import {
  getLatencySnapshot,
  subscribeLatency,
} from '../util/deviceCapability/latencyStore';
import { resolveNetworkTier } from '../util/deviceCapability/resolveNetworkTier';
import type {
  LatencyBucket,
  NetworkTier,
} from '../util/deviceCapability/types';

export type { LatencyBucket, NetworkTier };

export interface NetworkTierState {
  /** Transport tier folded with measured latency. */
  tier: NetworkTier | null;
  /** NetInfo-only tier, before the latency fold. */
  transportTier: NetworkTier | null;
  latency: LatencyBucket;
  /** Describes NetInfo only. */
  isResolved: boolean;
}

/**
 * Current network tier: the NetInfo transport tier, forced to `SLOW_CELLULAR` when
 * measured fetch latency is `slow` on any transport other than `NONE`.
 */
export function useNetworkTier(): NetworkTier | null {
  return useNetworkTierState().tier;
}

/**
 * Folded tier plus its causes, and whether NetInfo has moved past its initial
 * unknown state. A resolved `null` tier is still a valid unknown cohort, for
 * example VPN or cellular without a recognized generation.
 */
export function useNetworkTierState(): NetworkTierState {
  const { type, isInternetReachable, details } = useNetInfo();
  const bucket = useSyncExternalStore(subscribeLatency, getLatencySnapshot);
  const transportTier = computeNetworkTier({
    type,
    cellularGeneration: readCellularGeneration(details),
    isInternetReachable,
  });
  const { tier, latency } = resolveNetworkTier(transportTier, bucket);

  return {
    tier,
    transportTier,
    latency,
    isResolved: transportTier !== null || (type !== null && type !== 'unknown'),
  };
}
