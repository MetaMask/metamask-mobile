import { ViewStyle } from 'react-native';
import { AvatarProps, AvatarSize } from '../Avatar/Avatar.types';
import { IconProps, IconSize } from '../Icon/Icon.types';

/**
 * AvatarIcon component props.
 */
export interface AvatarIconProps extends AvatarProps {
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
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarSize]: IconSize;
};
