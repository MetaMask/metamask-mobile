// External dependencies.
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';
import { BadgeVariants } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

/**
 * BadgeAvatar component props.
 */
export interface BadgeAvatarProps extends Omit<BadgeBaseProps, 'children'> {
  /**
   * Variant of badge.
   */
  variant: BadgeVariants.Avatar;
  /**
   * Props for the avatarContent.
   */
  avatarProps: AvatarProps;
}

/**
 * Style sheet input parameters.
 */
export type BadgeAvatarStyleSheetVars = Pick<BadgeAvatarProps, 'style'>;
