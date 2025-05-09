/**
 * NetworkConnectMultiSelector props.
 */
export interface NetworkConnectMultiSelectorProps {
  isLoading?: boolean;
  onSubmit: (selectedChainIds: string[]) => void
  hostname: string;
  onBack: () => void;
  isRenderedAsBottomSheet?: boolean;
  defaultSelectedChainIds: string[];
}
