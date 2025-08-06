import { CaipChainId, Hex } from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../types';

/**
 * Creates a formatted native token object for the given chain ID
 */
export const getNativeSourceToken = (
  chainId: Hex | CaipChainId,
): BridgeToken => {
  const nativeAsset = getNativeAssetForChainId(chainId);

  // Use assetId for Solana to get balances properly for native SOL
  const address = isSolanaChainId(chainId)
    ? nativeAsset.assetId
    : nativeAsset.address;

  return {
    address,
    name: nativeAsset.name ?? '',
    symbol: nativeAsset.symbol,
    image:
      'iconUrl' in nativeAsset ? nativeAsset.iconUrl ?? undefined : undefined,
    decimals: nativeAsset.decimals,
    chainId,
  };
};
