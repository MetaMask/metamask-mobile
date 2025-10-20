import { CaipChainId, Hex } from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../types';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';

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

/**
 * Helper function to get default destination token, handling both hex and CAIP format chain IDs
 */
export const getDefaultDestToken = (
  chainId: Hex | CaipChainId,
): BridgeToken | undefined => {
  // Try direct lookup first
  let token = DefaultSwapDestTokens[chainId];
  if (token) return token;

  // If chainId is CAIP format (e.g., "eip155:1"), convert to hex and try again
  if (typeof chainId === 'string' && chainId.includes(':')) {
    const chainIdFromCaip = chainId.split(':')[1];
    const hexChainId = `0x${parseInt(chainIdFromCaip, 10).toString(16)}` as Hex;
    token = DefaultSwapDestTokens[hexChainId];
    if (token) {
      // Return token with CAIP chainId to match the request format
      return { ...token, chainId };
    }
  }

  return undefined;
};
