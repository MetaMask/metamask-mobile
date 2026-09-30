import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

export type PackRevealRarity = 'common' | 'uncommon' | 'rare' | 'epic';

export interface PackRevealProps {
  /** Full-resolution pack artwork; list thumbnails are unsuitable for this zoom. */
  packImage: ImageSourcePropType;
  /** Pack name announced by assistive technology. */
  packName: string;
  /** Actual result rarity, revealed visually only after cutting the seal. */
  rarity?: PackRevealRarity;
  /** Pauses presentation when the route is not focused. */
  isActive?: boolean;
  /** Wait for the card preview to load before offering the cut. */
  isReady?: boolean;
  /** Fires once when the card settles; never performs a purchase. */
  onRevealed: () => void;
  /** Provider-independent card content, mounted early to load its images. */
  children: ReactNode;
}
