import { CaipChainId } from '@metamask/utils';
import { ImageSourcePropType } from 'react-native';
import { NetworkMenuModalState } from '../NetworkManager/index.types';

export enum NetworkListItemType {
  Network = 'network',
  AdditionalNetworkSection = 'additional-network-section',
  SelectAllNetworksListItem = 'select-all-networks',
}

export interface SelectAllNetworksListItem {
  id: string;
  type: NetworkListItemType.SelectAllNetworksListItem;
  component: React.ReactNode;
  isSelected: boolean;
}

export interface Network {
  id: string;
  name: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
  caipChainId: CaipChainId;
  networkTypeOrRpcUrl?: string;
}

export interface AdditionalNetworkSection {
  id: string;
  type: NetworkListItemType.AdditionalNetworkSection;
  component: React.ReactNode;
}

export type NetworkListItem =
  | Network
  | AdditionalNetworkSection
  | SelectAllNetworksListItem;

export interface NetworkMultiSelectorListProps {
  onSelectNetwork?: (caipChainId: CaipChainId, onComplete?: () => void) => void;
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
  selectAllNetworksComponent?: React.ReactNode;
  openModal: (networkMenuModal: NetworkMenuModalState) => void;
  areAllNetworksSelected?: boolean;
}
