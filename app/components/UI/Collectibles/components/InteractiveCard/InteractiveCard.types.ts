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
  /** Replit uses a 3.6s orbit only for the revealed-card presentation. */
  presentation?: 'detail' | 'reveal';
  soldLabel?: string;
  /** The front image (or its fallback) can now be presented. */
  onImageReady?: () => void;
}
