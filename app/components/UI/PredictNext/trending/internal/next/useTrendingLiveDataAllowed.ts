import { useState } from 'react';
import { useNetworkTier } from '../../../../../../hooks/useNetworkTier';
import { getHardwareTier } from '../../../../../../util/deviceCapability';

/**
 * Whether Explore's Kalshi cards may hold live price and score watches, per
 * the device-capability UX matrix (app/util/deviceCapability/README.md). The
 * tiers are read separately and an unknown (`null`) tier is the product
 * default, never LOW or offline.
 *
 * No usable internet (`NONE`): no live watches; the cards keep their last
 * read prices. LOW hardware on slow cellular: no live watches, like the
 * matrix's "rare poll, no prefetch" cell; prices refresh with Explore's
 * pull-to-refresh. Everything else: live watches while the section is
 * visible.
 */
export const useTrendingLiveDataAllowed = (): boolean => {
  const networkTier = useNetworkTier();
  // RAM is fixed for the process, and each read is a synchronous native call.
  const [hardwareTier] = useState(getHardwareTier);

  if (networkTier === 'NONE') return false;
  return !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');
};
