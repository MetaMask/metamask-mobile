import { useNetInfo } from '@react-native-community/netinfo';
import { computeNetworkTier } from '../util/deviceCapability/computeNetworkTier';
import type { NetworkTier } from '../util/deviceCapability/types';

export type { NetworkTier };

export interface NetworkTierState {
  tier: NetworkTier | null;
  isResolved: boolean;
}

/**
 * Current network tier derived from `useNetInfo()`.
 *
 * Adds no extra NetInfo listener beyond the calling component's subscription.
 */
export function useNetworkTier(): NetworkTier | null {
  return useNetworkTierState().tier;
}

/**
 * Current network tier and whether NetInfo has moved past its initial unknown
 * state. A resolved `null` tier is still a valid unknown cohort, for example
 * VPN or cellular without a recognized generation.
 */
export function useNetworkTierState(): NetworkTierState {
  const { type, isInternetReachable, details } = useNetInfo();
  const tier = computeNetworkTier({
    type,
    cellularGeneration: readCellularGeneration(details),
    isInternetReachable,
  });

  return {
    tier,
    isResolved: tier !== null || (type !== null && type !== 'unknown'),
  };
}

function readCellularGeneration(
  details: ReturnType<typeof useNetInfo>['details'],
): string | null {
  if (!details || !('cellularGeneration' in details)) {
    return null;
  }

  const { cellularGeneration } = details;
  return typeof cellularGeneration === 'string' ? cellularGeneration : null;
}
