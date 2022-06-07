import { NetworksChainId } from '@metamask/controllers';
import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * NetworkAvatar component props.
 */
export interface NetworkAvatarProps extends BaseAvatarProps {
  /**
   * chain identification.
   */
  chainId: string;
  /**
   * chain name.
   */
  networkName: string;
  /**
   * chain image url.
   */
  networkImageURL?: string;
}

export interface NetworkAvatarStyleSheetVars {
  style: BaseAvatarProps['style'];
}
