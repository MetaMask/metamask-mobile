import type { HardwareTier } from '../../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../../hooks/useNetworkTier';

/** Single-page poll cadence, and the SocialV1 cadence on a healthy network. */
export const POSITIONS_REFRESH_INTERVAL_MS = 30_000;
const SLOW_NETWORK_REFRESH_INTERVAL_MS = 60_000;
const LOW_HARDWARE_SLOW_NETWORK_REFRESH_INTERVAL_MS = 120_000;

/**
 * Poll cadence for the SocialV1 positions page-1 refresh. Returns
 * `undefined` to stop polling. `null` tiers are unknown, not LOW or offline.
 */
export const getPositionsRefreshIntervalMs = ({
  hardwareTier,
  networkTier,
}: {
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
}): number | undefined => {
  if (networkTier === 'NONE') {
    return undefined;
  }

  if (networkTier === 'SLOW_CELLULAR') {
    return hardwareTier === 'LOW'
      ? LOW_HARDWARE_SLOW_NETWORK_REFRESH_INTERVAL_MS
      : SLOW_NETWORK_REFRESH_INTERVAL_MS;
  }

  return POSITIONS_REFRESH_INTERVAL_MS;
};
