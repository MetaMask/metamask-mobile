import type { SharedValue } from 'react-native-reanimated';

export interface InteractiveCardProps {
  /** Accessible card name, independent of its provider. */
  name: string;
  frontImage?: string;
  backImage?: string;
  /** Smaller sources displayed before the original images finish loading. */
  frontPreviewImage?: string;
  backPreviewImage?: string;
  /** Pause decorative motion when the containing screen is not focused. */
  isActive?: boolean;
  /** Optional pack reveal clock, used only for the card's entrance and final reflection. */
  revealProgress?: SharedValue<number>;
  /** The front image (or its fallback) can now be presented. */
  onImageReady?: () => void;
}
