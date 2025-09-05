import { CaipChainId } from '@metamask/utils';

export interface NetworkMenuModalState {
  isVisible: boolean;
  caipChainId: CaipChainId;
  displayEdit: boolean;
  networkTypeOrRpcUrl: string;
  isReadOnly: boolean;
}

export interface ShowConfirmDeleteModalState {
  isVisible: boolean;
  networkName: string;
  caipChainId?: CaipChainId;
}

export interface ShowMultiRpcSelectModalState {
  isVisible: boolean;
  chainId: string;
  networkName: string;
}
