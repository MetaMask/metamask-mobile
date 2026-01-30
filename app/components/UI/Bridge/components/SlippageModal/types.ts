import { CaipChainId, Hex } from '@metamask/utils';

export interface DefaultSlippageModalParams {
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
}
