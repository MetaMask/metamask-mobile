import { NetworksChainId } from '@metamask/controllers';
import { BaseAvatarProps } from '../BaseAvatar/BaseAvatar.types';

/**
 * NetworkAvatar component props.
 */
export interface NetworkAvatarProps extends BaseAvatarProps {
  /**
   * chain identification.
   */
  chainId: NetworksChainId;
}

export interface NetworkAvatarStyleSheetVars {
  style: BaseAvatarProps['style'];
}
