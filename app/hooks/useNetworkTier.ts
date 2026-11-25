import { useSyncExternalStore } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import {
  getDeviceCapabilityOverride,
  subscribeDeviceCapabilityOverride,
} from '../util/deviceCapability/override';
import {
  computeNetworkTier,
  readCellularGeneration,
} from '../util/deviceCapability/computeNetworkTier';
import type { NetworkTier } from '../util/deviceCapability/types';

export type { NetworkTier };

export interface NetworkTierState {
  tier: NetworkTier | null;
  isResolved: boolean;
}

function getNetworkOverride(): NetworkTier | null | undefined {
  return getDeviceCapabilityOverride().network;
}

/**
 * Current network tier derived from `useNetInfo()`. Transport / generation
 * only; measured slowness is `useNetworkLatency()`.
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
  const override = useSyncExternalStore(
    subscribeDeviceCapabilityOverride,
    getNetworkOverride,
  );
  const tier =
    override === undefined
      ? computeNetworkTier({
          type,
          cellularGeneration: readCellularGeneration(details),
          isInternetReachable,
        })
      : override;

  return {
    tier,
    isResolved: tier !== null || (type !== null && type !== 'unknown'),
  };
}
