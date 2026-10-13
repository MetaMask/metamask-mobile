import { useNetInfo } from '@react-native-community/netinfo';
import { computeNetworkTier } from '../util/deviceCapability/computeNetworkTier';
import type { NetworkTier } from '../util/deviceCapability/types';

export type { NetworkTier };

/**
 * Current network tier derived from `useNetInfo()`.
 *
 * Adds no extra NetInfo listener beyond the calling component's subscription.
 */
export function useNetworkTier(): NetworkTier | null {
  const { type, isInternetReachable, details } = useNetInfo();

  return computeNetworkTier({
    type,
    cellularGeneration: readCellularGeneration(details),
    isInternetReachable,
  });
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
