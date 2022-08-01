import { ImageStyle, ViewStyle } from 'react-native';
import { AvatarProps, AvatarSize } from '../Avatar/Avatar.types';
import { IconSize } from '../Icon';

/**
 * FaviconAvatar component props.
 */
export interface FaviconAvatarProps extends AvatarProps {
  /**
   * An icon URL
   */
  imageUrl: string;
}

/**
 * Favicon component style sheet.
 */
export interface FaviconAvatarStyleSheet {
  base: ViewStyle;
  image: ImageStyle;
}

/**
 * Style sheet input parameters.
 */
export interface FaviconAvatarStyleSheetVars
  extends Pick<FaviconAvatarProps, 'style'> {
  error: any;
}

/**
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarSize]: IconSize;
};
