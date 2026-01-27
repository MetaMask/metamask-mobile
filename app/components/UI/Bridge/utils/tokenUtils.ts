import { CaipAssetType, CaipChainId, Hex } from '@metamask/utils';
import {
  formatAddressToAssetId,
  formatChainIdToHex,
  getNativeAssetForChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { BridgeToken } from '../types';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';
import { IncludeAsset } from '../hooks/usePopularTokens';

/**
 * Creates a formatted native token object for the given chain ID
 */
export const getNativeSourceToken = (
  chainId: Hex | CaipChainId,
): BridgeToken => {
  const nativeAsset = getNativeAssetForChainId(chainId);

  // getNativeAssetForChainId returns zero address for non-EVM chains, we need the CAIP assetId to get balances properly for native asset
  const address = isNonEvmChainId(chainId)
    ? nativeAsset.assetId
    : nativeAsset.address;

  const formattedChainId = isNonEvmChainId(chainId)
    ? chainId
    : formatChainIdToHex(chainId);

  const nativeSourceTokenFormatted = {
    address,
    name: nativeAsset.name ?? '',
    symbol: nativeAsset.symbol,
    image: 'iconUrl' in nativeAsset ? nativeAsset.iconUrl || '' : '',
    decimals: nativeAsset.decimals,
    chainId: formattedChainId,
  };

  return nativeSourceTokenFormatted;
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

/**
 * Converts a BridgeToken to IncludeAsset format for the API.
 * Returns null if the token cannot be converted (invalid assetId).
 */
export const tokenToIncludeAsset = (
  token: BridgeToken,
): IncludeAsset | null => {
  const assetId = formatAddressToAssetId(token.address, token.chainId);
  if (!assetId) return null;

  return {
    assetId: isNonEvmChainId(token.chainId)
      ? assetId
      : (assetId.toLowerCase() as CaipAssetType),
    name: token.name ?? '',
    symbol: token.symbol,
    decimals: token.decimals,
  };
};
