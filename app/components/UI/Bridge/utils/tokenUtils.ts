import {
  CaipAssetType,
  CaipChainId,
  Hex,
  parseCaipAssetType,
  toCaipAssetType,
} from '@metamask/utils';
import {
  formatAddressToAssetId,
  formatChainIdToHex,
  getNativeAssetForChainId,
  isNonEvmChainId,
} from '@metamask/bridge-controller';
import { zeroAddress } from 'ethereumjs-util';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import type { BridgeToken, IncludeAsset } from '../types';
import { DefaultSwapDestTokens } from '../constants/default-swap-dest-tokens';
import { POLYGON_NATIVE_TOKEN } from '../constants/assets';

/**
 * Normalizes chain-specific native token addresses to the zero address for the bridge flow.
 *
 * Some chains use a non-zero contract address for their native token
 * (e.g. Polygon uses 0x0000000000000000000000000000000000001010), but the bridge API
 * expects the zero address for all native assets.
 */
export const normalizeTokenAddress = (
  address: string,
  chainId: Hex | CaipChainId,
): string => {
  const isPolygonNativeToken =
    chainId === CHAIN_IDS.POLYGON && address === POLYGON_NATIVE_TOKEN;
  return isPolygonNativeToken ? zeroAddress() : address;
};

/**
 * Normalizes EVM ERC-20 CAIP-19 asset IDs for stable comparisons.
 *
 * ERC-20 addresses can arrive checksummed or mixed-case from different sources,
 * while non-EVM asset references may be case-sensitive. Only lowercase the
 * asset reference for `eip155:* / erc20:*` assets and leave everything else as-is.
 */
export function normalizeEvmAssetId(assetId: CaipAssetType): CaipAssetType {
  try {
    const { assetNamespace, assetReference, chain, chainId } =
      parseCaipAssetType(assetId);

    if (assetNamespace !== 'erc20' || !chainId.startsWith('eip155:')) {
      return assetId;
    }

    return toCaipAssetType(
      chain.namespace,
      chain.reference,
      assetNamespace,
      assetReference.toLowerCase(),
    );
  } catch {
    return assetId;
  }
}

export function getBridgeTokenAssetId(
  token: BridgeToken,
): CaipAssetType | undefined {
  try {
    const assetId = formatAddressToAssetId(token.address, token.chainId);
    return assetId ? normalizeEvmAssetId(assetId) : undefined;
  } catch {
    return undefined;
  }
}

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
 * Checks if a token matches a search query by name, symbol, or address.
 * Returns true if no query is provided.
 */
export const tokenMatchesQuery = (
  token: BridgeToken,
  query: string,
): boolean => {
  if (!query) return true;
  const lowerQuery = query.toLowerCase();
  return (
    token.name?.toLowerCase().includes(lowerQuery) ||
    token.symbol.toLowerCase().includes(lowerQuery) ||
    token.address.toLowerCase().includes(lowerQuery)
  );
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
    ...token,
    assetId: isNonEvmChainId(token.chainId)
      ? assetId
      : (assetId.toLowerCase() as CaipAssetType),
    name: token.name ?? '',
  };
};
