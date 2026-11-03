import React from 'react';
import { Skeleton } from '../../../../component-library/components-temp/Skeleton';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../util/deviceCapability';

export const METAMASK_ORANGE_MENU_SKELETON_TEST_ID =
  'metamask-orange-menu-skeleton';

/**
 * Placeholder for the Orange menu label while membership is still resolving.
 * Sized to the longer "Join MetaMask Orange" line so the row does not jump
 * when the real copy arrives.
 *
 * A low-memory device or a known offline network gets a static bar. Unknown
 * hardware or network keeps the animated skeleton.
 */
const MetamaskOrangeMenuSkeleton = () => {
  const hardwareTier = getHardwareTier();
  const networkTier = useNetworkTier();
  const reduceMotion = hardwareTier === 'LOW' || networkTier === 'NONE';

  return (
    <Skeleton
      width={168}
      height={16}
      testID={METAMASK_ORANGE_MENU_SKELETON_TEST_ID}
      {...(reduceMotion ? { autoPlay: false } : {})}
    />
  );
};

export default MetamaskOrangeMenuSkeleton;
