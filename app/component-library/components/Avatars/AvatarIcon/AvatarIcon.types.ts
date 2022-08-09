// External dependencies.
import { AvatarBaseProps, AvatarBaseSize } from '../AvatarBase';
import { IconProps, IconSize } from '../../Icon/Icon.types';

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
  [key in AvatarBaseSize]: IconSize;
};
