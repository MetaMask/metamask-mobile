// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarVariants, AvatarSize } from '../../Avatar.types';
import { IconProps, IconSize } from '../../../../Icons/Icon';

/**
 * AvatarIcon component props.
 */
export interface AvatarIconProps extends AvatarBaseProps {
  /**
   * Variant of Avatar
   */
  variant?: AvatarVariants.Icon;
  /**
   * Name of icon to use.
   */
  name: IconProps['name'];
  /**
   * Optional color to apply to the icon.
   */
  iconColor?: string;
  /**
   * Optional color to apply to the background of the icon.
   */
  backgroundColor?: string;
}

/**
 * Style sheet input parameters.
 */
export type AvatarIconStyleSheetVars = Pick<
  AvatarIconProps,
  'style' | 'backgroundColor'
>;

/**
 * Mapping of IconSize by AvatarSize.
 */
export type IconSizeByAvatarSize = {
  [key in AvatarSize]: IconSize;
};
