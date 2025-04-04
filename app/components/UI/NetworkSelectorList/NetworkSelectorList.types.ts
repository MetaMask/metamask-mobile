import { ImageSourcePropType } from 'react-native';
export interface Network {
  id: string;
  name: string;
  rpcUrl: string;
  isSelected: boolean;
  yOffset?: number;
  imageSource: ImageSourcePropType;
}

export interface NetworkConnectMultiSelectorProps {
  onSelectNetwork?: (id: string, isSelected: boolean) => void;
  networks?: Network[];
  isLoading?: boolean;
  selectedChainIds?: string[];
  isMultiSelect?: boolean;
  renderRightAccessory?: (id: string, name: string) => React.ReactNode;
  isSelectionDisabled?: boolean;
  isAutoScrollEnabled?: boolean;
}
