import type { ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';

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
  /** Mounted early to load images; the render function shares the reveal's UI-thread clock. */
  children: ReactNode | ((progress: SharedValue<number>) => ReactNode);
}
