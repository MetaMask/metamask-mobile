import { AccountAvatarProps } from '../AccountAvatar/AccountAvatar.types';
import { NetworkAvatarProps } from '../NetworkAvatar/NetworkAvatar.types';

/**
 * Avatar badge possible placement.
 */
export enum AvatarBadgePosition {
  TopRight = 'top-right',
  BottomRight = 'bottom-right',
}

/**
 * AccountAvatarOnNetwork component props.
 */
export interface AccountAvatarOnNetworkProps
  extends AccountAvatarProps,
    NetworkAvatarProps {
    badgePosition?: AvatarBadgePosition;
  }
