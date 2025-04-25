// External dependencies.
import { CaipChainId } from '@metamask/utils';

/**
 * NetworkConnectMultiSelector props.
 */
export interface NetworkConnectMultiSelectorProps {
  isLoading?: boolean;
  onSubmit: (selectedChainIds: CaipChainId[]) => void
  hostname: string;
  onBack: () => void;
  isRenderedAsBottomSheet?: boolean;
  defaultSelectedChainIds: CaipChainId[];
}
