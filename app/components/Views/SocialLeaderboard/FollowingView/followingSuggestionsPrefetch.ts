import type { NetworkTier } from '../../../../hooks/useNetworkTier';
import type { HardwareTier } from '../../../../util/deviceCapability';

/**
 * Whether the Following tab may request suggestions before its feed reports
 * empty, per the device-capability UX matrix. No network means no fetch. LOW
 * hardware skips the prefetch on any known network. A `null` network is the
 * product default, and a `null` hardware tier is never read as LOW.
 */
export function canPrefetchFollowingSuggestions(
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
): boolean {
  if (networkTier === 'NONE') {
    return false;
  }
  return !(hardwareTier === 'LOW' && networkTier !== null);
}
