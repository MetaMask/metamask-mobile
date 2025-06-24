import { CaipChainId } from '@metamask/utils';
import { ImageSourcePropType } from 'react-native';

export interface Network {
  id: string;
  name: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
}

export interface SectionHeader {
  id: string;
  title: string;
  type: 'header';
}

export type NetworkListItem = Network | SectionHeader;

export interface NetworkConnectMultiSelectorProps {
  onSelectNetwork?: (caipChainId: CaipChainId, isSelected: boolean) => void;
  networks?: Network[];
  additionalNetworks?: Network[];
  isLoading?: boolean;
  selectedChainIds?: CaipChainId[];
  renderRightAccessory?: (
    caipChainId: CaipChainId,
    name: string,
  ) => React.ReactNode;
  isSelectionDisabled?: boolean;
  isAutoScrollEnabled?: boolean;
  showSectionHeaders?: boolean;
  showDefaultNetworksHeader?: boolean;
  defaultNetworksTitle?: string;
  additionalNetworksTitle?: string;
}
