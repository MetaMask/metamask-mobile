import { ImageSourcePropType } from 'react-native';
import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * NetworkAvatar component props.
 */
export interface NetworkAvatarProps extends BaseAvatarProps {
  /**
   * chain name.
   */
  networkName?: string;
  /**
   * chain image url.
   */
  networkImage?: ImageSourcePropType;
}

export interface NetworkAvatarStyleSheetVars {
  size: BaseAvatarProps['size'];
}
