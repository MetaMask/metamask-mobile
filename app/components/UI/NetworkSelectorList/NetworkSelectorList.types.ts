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

export interface NetworkConnectMultiSelectorProps {
  onSelectNetwork?: (caipChainId: CaipChainId, isSelected: boolean) => void;
  networks?: Network[];
  isLoading?: boolean;
  selectedChainIds?: CaipChainId[];
  isMultiSelect?: boolean;
  renderRightAccessory?: (
    caipChainId: CaipChainId,
    name: string,
  ) => React.ReactNode;
  isSelectionDisabled?: boolean;
  isAutoScrollEnabled?: boolean;
}
