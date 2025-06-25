import { CaipChainId } from '@metamask/utils';

export interface NetworkMenuModal {
  isVisible: boolean;
  caipChainId: CaipChainId;
  displayEdit: boolean;
  networkTypeOrRpcUrl: string;
  isReadOnly: boolean;
}
