// External dependencies.
import { AvatarVariants } from '../../Avatar.types';
import { AvatarBaseProps } from '../../foundation/AvatarBase';
import { IconProps } from '../../../../Icon';

/**
 * AvatarIcon component props.
 */

export type AvatarIconProps = AvatarBaseProps &
  Omit<IconProps, 'size'> & {
    /**
     * Avatar variants.
     */
    variant?: AvatarVariants.Icon;
  };
