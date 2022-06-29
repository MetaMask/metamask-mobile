import { ImageStyle, ViewStyle } from 'react-native';
import {
  BaseAvatarProps,
  BaseAvatarSize,
} from '../BaseAvatar/BaseAvatar.types';
import { IconSize } from '../Icon';

/**
 * FaviconAvatar component props.
 */
export interface FaviconAvatarProps extends BaseAvatarProps {
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
 * Mapping of IconSize by BaseAvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in BaseAvatarSize]: IconSize;
};
