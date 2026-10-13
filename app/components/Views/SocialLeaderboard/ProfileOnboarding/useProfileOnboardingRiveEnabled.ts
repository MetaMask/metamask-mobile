import { useMemo } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';

/**
 * Whether profile onboarding should play its Rive animations. Skips them
 * offline, on low hardware over slow cellular, and with Reduce Motion on.
 * Unknown tiers keep the animation (product default).
 */
export const useProfileOnboardingRiveEnabled = (): boolean => {
  const prefersReducedMotion = useReducedMotion();
  const networkTier = useNetworkTier();
  const hardwareTier = useMemo(() => getHardwareTier(), []);

  return !(
    prefersReducedMotion ||
    networkTier === 'NONE' ||
    (hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR')
  );
};
