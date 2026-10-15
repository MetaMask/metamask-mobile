import type { HardwareTier } from '../../../util/deviceCapability';
import type { NetworkTier } from '../../../util/deviceCapability/types';

/**
 * Handle for section components that support refresh functionality
 */
export interface SectionRefreshHandle {
  refresh: () => Promise<void>;
}

export interface HomepageDeviceCapability {
  hardwareTier: HardwareTier | null;
  networkTier: NetworkTier | null;
  networkTierResolved: boolean;
}

/**
 * Rendering mode for homepage prediction sections.
 *
 * - 'default': shows positions and falls back to discovery content when empty
 * - 'sports': shows sports prediction markets with sport-type chips
 */
export type HomeSectionMode = 'default' | 'sports';
