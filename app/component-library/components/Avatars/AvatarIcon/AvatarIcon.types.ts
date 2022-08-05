// External dependencies.
import { AvatarBaseProps, AvatarBaseSize } from '../AvatarBase';
import { IconProps, IconSize } from '../../Icon/Icon.types';

/**
 * AvatarIcon component props.
 */
export interface AvatarIconProps extends AvatarBaseProps {
  /**
   * Icon to use.
   */
  icon: IconProps['name'];
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
