import { brandColor } from '@metamask/design-tokens';

/** Replit rarity.css badge/artwork palette; reveal FX have their own authored colors. */
export const RARITY_COLORS = {
  common: brandColor.grey400,
  uncommon: brandColor.orange300,
  rare: brandColor.blue300,
  epic: brandColor.yellow100,
} as const;
