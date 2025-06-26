import { ImageSourcePropType } from 'react-native';
import { CaipChainId } from '@metamask/utils';
import { NetworkMenuModal } from '../Tokens/TokensBottomSheet/TokenFilterBottomSheet.types';

export interface CustomNetworkItem {
  id: string;
  name: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
  networkTypeOrRpcUrl?: string;
}

export interface CustomNetworkSelectorProps {
  openModal: (networkMenuModal: NetworkMenuModal) => void;
}
