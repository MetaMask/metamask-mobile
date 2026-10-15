import type { HardwareTier } from '../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../util/deviceCapability/types';

export type HomepageSectionMountMode =
  | 'immediate'
  | 'after_primary_content'
  | 'when_network_available';

/**
 * Selects when non-primary Homepage sections may mount.
 *
 * The primary token surface remains mounted in every mode. Hardware and
 * network tiers stay separate so an unknown network does not get treated as
 * offline or low-end.
 */
export const getHomepageSectionMountMode = ({
  hardwareTier,
  networkTier,
}: {
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
}): HomepageSectionMountMode => {
  if (networkTier === 'NONE') {
    return 'when_network_available';
  }

  if (networkTier === 'SLOW_CELLULAR') {
    return 'after_primary_content';
  }

  if (
    (networkTier === 'FAST_CELLULAR' || networkTier === 'WIFI') &&
    hardwareTier === 'LOW'
  ) {
    return 'after_primary_content';
  }

  return 'immediate';
};
