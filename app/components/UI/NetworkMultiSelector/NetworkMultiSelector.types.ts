import { CaipChainId } from '@metamask/utils';
import { NetworkMenuModalState } from '../NetworkManager/index.types';

export interface NetworkMultiSelectorProps {
  openModal: (networkMenuModal: NetworkMenuModalState) => void;
  dismissModal?: () => void;
  openRpcModal?: (params: { chainId: string; networkName: string }) => void;
  /**
   * Reports selection of an already-added popular network or "All popular
   * networks" to the caller's own (Redux-free) state, instead of writing to
   * NetworkEnablementController/Redux. `null` means "all popular networks".
   * Adding a brand-new network is unaffected and always writes to Redux.
   */
  onLocalNetworkSelect: (chainIds: CaipChainId[] | null) => void;
  /** Current local selection, used to drive checkmarks. */
  localSelectedChainIds: CaipChainId[] | null;
}
