import { ViewStyle } from 'react-native';
import {
  BaseAvatarProps,
  BaseAvatarSize,
} from '../BaseAvatar/BaseAvatar.types';
import { IconProps, IconSize } from '../Icon/Icon.types';

/**
 * AvatarIcon component props.
 */
export interface AvatarIconProps extends BaseAvatarProps {
  /**
   * Icon to use.
   */
  icon: IconProps['name'];
}

/**
 * AvatarIcon component style sheet.
 */
export interface AvatarIconStyleSheet {
  base: ViewStyle;
}

/**
 * Style sheet input parameters.
 */
export type AvatarIconStyleSheetVars = Pick<AvatarIconProps, 'style'>;

/**
 * Mapping of IconSize by BaseAvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in BaseAvatarSize]: IconSize;
};
