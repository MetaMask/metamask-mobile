import { typography } from '@metamask/design-tokens';

export const PACK_TILE_ARTWORK_ASPECT_RATIO = 203 / 338;
export const COMPACT_PACK_ACTION_HEIGHT = 32;

/** Copy padding, one title line, row spacing and the compact purchase action. */
export const getCompactPurchaseCopyHeight = (fontScale: number): number =>
  8 +
  typography.sBodySM.lineHeight * fontScale +
  14 +
  COMPACT_PACK_ACTION_HEIGHT;
