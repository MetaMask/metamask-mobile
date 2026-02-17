import { ImageSourcePropType } from 'react-native';
import { Hex } from '@metamask/utils';
import { NetworkSelectorSource } from '../../../constants/networkSelector';

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

/**
 * Network selector route parameters
 */
export interface NetworkSelectorRouteParams {
  chainId?: Hex;
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
  source?: NetworkSelectorSource;
}
