<<<<<<< HEAD
import { CaipChainId } from '@metamask/utils';

=======
>>>>>>> stable
/**
 * NetworkConnectMultiSelector props.
 */
export interface NetworkConnectMultiSelectorProps {
  isLoading?: boolean;
<<<<<<< HEAD
  onSubmit: (selectedChainIds: CaipChainId[]) => void
  hostname: string;
  onBack: () => void;
  isRenderedAsBottomSheet?: boolean;
  defaultSelectedChainIds: CaipChainId[];
=======
  onSubmit: (selectedChainIds: string[]) => void
  hostname: string;
  onBack: () => void;
  isRenderedAsBottomSheet?: boolean;
  defaultSelectedChainIds: string[];
>>>>>>> stable
}
