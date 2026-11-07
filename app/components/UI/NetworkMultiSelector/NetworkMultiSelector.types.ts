import { NetworkMenuModalState } from '../NetworkManager/index.types';

export interface NetworkMultiSelectorProps {
  openModal: (networkMenuModal: NetworkMenuModalState) => void;
  dismissModal?: () => void;
  openRpcModal?: (params: { chainId: string; networkName: string }) => void;
  /** Set only when opened from the Tokens list; enables the filtering event. */
  searchQuery?: string;
}
