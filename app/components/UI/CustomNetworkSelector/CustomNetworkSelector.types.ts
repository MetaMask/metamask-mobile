import { ImageSourcePropType } from 'react-native';
import { CaipChainId } from '@metamask/utils';
import { NetworkMenuModalState } from '../NetworkManager/index.types';

export interface CustomNetworkItem {
  id: string;
  name: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
  networkTypeOrRpcUrl?: string;
  hasMultipleRpcs?: boolean;
}

export interface CustomNetworkSelectorProps {
  openModal: (networkMenuModal: NetworkMenuModalState) => void;
  dismissModal: () => void;
  openRpcModal?: (params: { chainId: string; networkName: string }) => void;
  /** The popular-networks tab reports selection here instead of writing to Redux; the custom tab mirrors this. */
  onLocalNetworkSelect: (chainIds: CaipChainId[] | null) => void;
  /** Current local selection, used to drive checkmarks. */
  localSelectedChainIds: CaipChainId[] | null;
}
