// External dependencies.
import { AvatarVariants } from '../../Avatar2.types';
import { Avatar2BaseProps } from '../../foundation/Avatar2Base';
import { IconProps } from '../../../../Icon';

/**
 * AvatarIcon component props.
 */
export interface AvatarIconProps
  extends Avatar2BaseProps,
    Omit<IconProps, 'size'> {
  /**
   * Avatar variants.
   */
  variant: AvatarVariants.Icon;
}
