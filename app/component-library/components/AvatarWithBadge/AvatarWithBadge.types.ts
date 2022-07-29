import BaseAvatar from '../BaseAvatar';
import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * Avatar badge possible placement.
 */
export enum AvatarBadgePosition {
  TopRight = 'top-right',
  BottomRight = 'bottom-right',
}

/**
 * AvatarWithBadge component props.
 */
export interface AvatarWithBadgeProps extends BaseAvatarProps {
  /**
   * Boolean that decides if the badge gets rendered or not.
   */
  showBadge: boolean;
  /**
   * Enum to select the badge position.
   */
  badgePosition: AvatarBadgePosition;
  /**
   * Enum to select the badge position.
   */
  children: typeof BaseAvatar;
  /**
   * Badge component.
   */
  badge: JSX.Element;
}
