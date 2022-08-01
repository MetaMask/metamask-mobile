import { AvatarProps } from '../Avatar/Avatar.types';

/**
 * NetworkAvatar component props.
 */
export interface NetworkAvatarProps extends AvatarProps {
  /**
   * Chain name.
   */
  networkName?: string;
  /**
   * Chain image URL.
   */
  networkImageUrl?: string;
}

export interface NetworkAvatarStyleSheetVars
  extends Pick<NetworkAvatarProps, 'size' | 'style'> {
  showPlaceholder: boolean;
}
