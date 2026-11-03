import type { HardwareTier } from '../../../../util/deviceCapability';
import type { NetworkTier } from '../../../../util/deviceCapability/types';

export interface SocialFooterDurations {
  collapse: number;
  hold: number;
  expand: number;
}

const FULL_MOTION: SocialFooterDurations = {
  collapse: 280,
  hold: 40,
  expand: 340,
};

const LIGHT_MOTION: SocialFooterDurations = {
  collapse: 140,
  hold: 0,
  expand: 160,
};

const NO_MOTION: SocialFooterDurations = {
  collapse: 0,
  hold: 0,
  expand: 0,
};

/**
 * Footer morph timing.
 * Low hardware with a known network uses a shorter morph. Unknown hardware
 * or an unknown network keeps the full motion.
 */
export const getSocialFooterDurations = (
  hardware: HardwareTier | null,
  network: NetworkTier | null,
  reducedMotion: boolean,
): SocialFooterDurations => {
  if (reducedMotion) {
    return NO_MOTION;
  }
  if (hardware === 'LOW' && network !== null) {
    return LIGHT_MOTION;
  }
  return FULL_MOTION;
};
