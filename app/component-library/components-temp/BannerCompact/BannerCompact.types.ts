// Third party dependencies
import type { ReactNode } from 'react';
import type { ImageSourcePropType, PressableProps } from 'react-native';

export type BannerCompactThumbnailShape = 'round' | 'square';

/**
 * BannerCompact component props.
 */
export interface BannerCompactProps extends Omit<PressableProps, 'onPress'> {
  /**
   * Art shown in the leading 72x72 slot: an image source, or any node —
   * e.g. a Rive animation — sized to fit the slot.
   */
  thumbnail?: ImageSourcePropType | ReactNode;
  /**
   * Corner shape of the thumbnail slot: rounded corners for `square`
   * (default), fully rounded for `round`.
   */
  thumbnailShape?: BannerCompactThumbnailShape;
  /**
   * The banner's title.
   */
  title: string;
  /**
   * The banner's description. It wraps to as many lines as it needs.
   */
  description: string;
  /**
   * Optional action shown under the description as a small secondary
   * button. The whole row stays the press target.
   */
  actionLabel?: string;
  /**
   * Called when the whole row is pressed. When omitted the row is static and
   * is not rendered as a button.
   */
  onPress?: () => void;
  /**
   * Called when the close button is pressed. When provided, a close button is
   * overlaid on the row's top-right corner as a sibling of the row.
   */
  onClose?: () => void;
  /**
   * Optional test ID for the banner's root element.
   */
  testID?: string;
}
