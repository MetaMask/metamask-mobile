import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * NetworkAvatar component props.
 */
export interface NetworkAvatarProps extends BaseAvatarProps {
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
