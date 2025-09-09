import type { Hex } from '@metamask/utils';
import type { ImageSourcePropType } from 'react-native';
import type { NetworkSelectorSource } from '../../../constants/networkSelector';

export interface infuraNetwork {
  name: string;
  imageSource: ImageSourcePropType;
  chainId: Hex;
}

export interface ShowConfirmDeleteModalState {
  isVisible: boolean;
  networkName: string;
  chainId?: Hex;
}

export interface NetworkSelectorRouteParams {
  chainId?: Hex | string;
  hostInfo?: {
    metadata?: {
      origin?: string;
    };
  };
  source?: NetworkSelectorSource;
}
