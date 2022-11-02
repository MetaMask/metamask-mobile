// Internal dependencies.
import { BadgeAvatarProps } from './variants/BadgeAvatar/BadgeAvatar.types';

/**
 * Badge variants.
 */
export enum BadgeVariants {
  Avatar = 'avatar',
}

/**
 * Badge Account component props.
 */
export type BadgeProps = BadgeAvatarProps & {
  /**
   * Variant of badge.
   */
  variant: BadgeVariants;
};
