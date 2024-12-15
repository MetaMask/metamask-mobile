// External dependencies.
import { USER_INTENT } from '../../../../constants/permissions';

/**
 * NetworkConnectMultiSelector props.
 */
export interface NetworkConnectMultiSelectorProps {
  selectedNetworkIdentifiers?: string[];
  onSelectNetworkIds?: (ids: string[]) => void;
  isLoading?: boolean;
  onUserAction: React.Dispatch<React.SetStateAction<USER_INTENT>>;
  urlWithProtocol: string;
  hostname: string;
  onBack: () => void;
  isRenderedAsBottomSheet?: boolean;
  onNetworksSelected?: (selectedChainIds: string[]) => void;
  initialChainId?: string;
  selectedChainIds?: string[];
  isInitializedWithPermittedChains?: boolean;
}
