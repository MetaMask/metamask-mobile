import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';

export interface SwapSlippageModalParams {
  sourceChainId?: CaipChainId | Hex;
  destChainId?: CaipChainId | Hex;
}

export interface BatchSellSlippageModalParams extends SwapSlippageModalParams {
  batchSellAssetId: CaipAssetType;
}
