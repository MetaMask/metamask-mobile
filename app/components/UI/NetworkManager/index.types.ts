import { CaipChainId } from '@metamask/utils';

export interface NetworkMenuModalState {
  isVisible: boolean;
  caipChainId: CaipChainId;
  displayEdit: boolean;
  /** Whether this network is the true active network (MultichainNetworkController), not the local list filter. */
  isActiveNetwork: boolean;
  networkTypeOrRpcUrl: string;
  isReadOnly: boolean;
}

export interface ShowConfirmDeleteModalState {
  isVisible: boolean;
  networkName: string;
  caipChainId?: CaipChainId;
  /** Whether the network being deleted is the true active network; if so, we must switch away from it first. */
  isActiveNetwork?: boolean;
}

export interface ShowMultiRpcSelectModalState {
  isVisible: boolean;
  chainId: string;
  networkName: string;
}
