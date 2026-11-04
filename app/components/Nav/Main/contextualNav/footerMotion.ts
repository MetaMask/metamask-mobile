import type {
  HardwareTier,
  NetworkTier,
} from '../../../../util/deviceCapability/types';

export type FooterMotion = 'morph' | 'crossfade';

/**
 * Width morph versus a quick crossfade.
 *
 * Reduce Motion always crossfades. LOW hardware crossfades on a known
 * network. `null` network is not treated as offline, so LOW + unknown
 * network keeps the morph (the matrix's product-default cell). `null`
 * hardware and `null` reduce-motion keep the morph.
 */
export const getFooterMotion = (
  hardware: HardwareTier | null,
  network: NetworkTier | null,
  reduceMotion: boolean | null,
): FooterMotion => {
  if (reduceMotion === true) {
    return 'crossfade';
  }
  if (hardware === 'LOW' && network !== null) {
    return 'crossfade';
  }
  return 'morph';
};

export const FOOTER_COLLAPSE_MS = 150;
export const FOOTER_EXPAND_MS = 200;
export const FOOTER_CROSSFADE_MS = 140;
