import { CaipChainId } from '@metamask/utils';
import { ImageSourcePropType } from 'react-native';

export enum NetworkListItemType {
  Network = 'network',
  AdditionalNetworkSection = 'additional-network-section',
}

export interface Network {
  id: string;
  name: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
}

export interface AdditionalNetworkSection {
  id: string;
  type: NetworkListItemType.AdditionalNetworkSection;
  component: React.ReactNode;
}

export type NetworkListItem = Network | AdditionalNetworkSection;

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
  additionalNetworksComponent?: React.ReactNode;
}
