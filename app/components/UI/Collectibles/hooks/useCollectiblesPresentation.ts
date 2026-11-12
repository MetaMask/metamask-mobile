import { useState } from 'react';
import { getHardwareTier } from '../../../../util/deviceCapability';
import { useNetworkTier } from '../../../../hooks/useNetworkTier';

/** Budgets for lists and optional effects, not eligibility for bundled video. */
export function useCollectiblesPresentation() {
  const [hardware] = useState(getHardwareTier);
  const network = useNetworkTier();
  // The shared device-capability matrix keeps product defaults for unknown transport.
  const lowMemory = hardware === 'LOW' && network !== null;
  return {
    hardware,
    network,
    online: network !== 'NONE',
    previewCount: network === 'SLOW_CELLULAR' || lowMemory ? 4 : 8,
    drawDistance: lowMemory ? 160 : 350,
    animate: network !== 'NONE' && !lowMemory,
  };
}
