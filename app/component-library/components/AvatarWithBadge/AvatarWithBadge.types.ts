import { ViewProps } from 'react-native';
import BaseAvatar from '../BaseAvatar';

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
export interface AvatarWithBadgeProps extends ViewProps {
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
}
