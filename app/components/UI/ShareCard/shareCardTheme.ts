import { brandColor } from '@metamask/design-tokens';
import type { ShareCardDirection } from './ShareCard.types';

export interface ShareCardTheme {
  /** Frame, line, markers, and P&L text. */
  accent: string;
  /** Text and glyphs drawn on top of the accent. */
  onAccent: string;
  panel: string;
  ink: string;
  soft: string;
  chip: string;
  onChip: string;
}

const MONO_BASE = {
  onAccent: brandColor.black,
  panel: brandColor.black,
  ink: brandColor.white,
  soft: 'rgba(255, 255, 255, 0.55)',
  chip: brandColor.white,
  onChip: brandColor.black,
};

/**
 * The card is always dark, whatever the app theme, because the exported image
 * has to look the same wherever it is posted. Mono is lime when the result is
 * up and orange when it is down.
 */
export const getShareCardTheme = (
  direction: ShareCardDirection,
): ShareCardTheme => ({
  ...MONO_BASE,
  accent: direction === 'up' ? brandColor.lime100 : brandColor.orange400,
});
