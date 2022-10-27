// External dependencies.
import { AvatarProps } from '../../../../Avatars/Avatar/Avatar.types';
import { BadgeVariants } from '../../Badge.types';
import { BadgeBaseProps } from '../../foundation/BadgeBase/BadgeBase.types';

/**
 * Enum that represents the position of the avatar badge.
 */
export enum BadgeAvatarPosition {
  TopRight = 'TopRight',
  BottomRight = 'BottomRight',
}

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
  /**
   * Enum that represents the position of the network badge.
   * @defaults TopRight
   */
  position?: BadgeAvatarPosition;
}

/**
 * Style sheet input parameters.
 */
export type BadgeAvatarStyleSheetVars = Pick<
  BadgeAvatarProps,
  'style' | 'position'
>;
