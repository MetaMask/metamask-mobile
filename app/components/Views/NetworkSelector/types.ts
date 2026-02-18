import { ImageSourcePropType } from 'react-native';
import { Hex } from '@metamask/utils';

/**
 * Infura network configuration
 */
export interface infuraNetwork {
  name: string;
  imageSource: ImageSourcePropType;
  chainId: Hex;
}

/**
 * State for confirm delete modal
 */
export interface ShowConfirmDeleteModalState {
  isVisible: boolean;
  networkName: string;
  chainId?: `0x${string}`;
}
