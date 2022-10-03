// External dependencies.
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { AvatarSize } from '../../Avatar.types';
import { IconProps, IconSize } from '../../../../Icon/Icon.types';

/**
 * AvatarIcon component props.
 */
export interface AvatarIconProps extends AvatarBaseProps {
  /**
   * Name of icon to use.
   */
  name: IconProps['name'];
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
