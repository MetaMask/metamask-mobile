export interface Network {
  id: string;
  name: string;
  rpcUrl: string;
  isSelected: boolean;
  yOffset?: number;
  // TODO: Replace "any" with type
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageSource: any;
}

export interface NetworkConnectMultiSelectorProps {
  onSelectNetwork?: (id: string, isSelected: boolean) => void;
  networks?: Network[];
  isLoading?: boolean;
  selectedNetworkIds?: string[];
  isMultiSelect?: boolean;
  renderRightAccessory?: (id: string, name: string) => React.ReactNode;
  isSelectionDisabled?: boolean;
  isAutoScrollEnabled?: boolean;
}
