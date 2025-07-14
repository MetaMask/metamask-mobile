import {
  CaipChainId,
  Hex,
  isCaipAssetType,
  parseCaipAssetType,
} from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { safeToChecksumAddress } from '../../../../util/address';
import { BridgeToken } from '../types';

/**
 * Creates a formatted native token object for the given chain ID
 * @param chainId - The chain ID (Hex or CAIP format)
 * @returns Formatted BridgeToken object for the native token
 */
export const getNativeSourceToken = (
  chainId: Hex | CaipChainId,
): BridgeToken => {
  const nativeAsset = getNativeAssetForChainId(chainId);

  // getNativeAssetForChainId returns zero address for Solana, we need the assetId to get balances properly for native SOL
  const address = isSolanaChainId(chainId)
    ? nativeAsset.assetId
    : nativeAsset.address;

  const nativeSourceTokenFormatted: BridgeToken = {
    address,
    name: nativeAsset.name ?? '',
    symbol: nativeAsset.symbol,
    image:
      'iconUrl' in nativeAsset ? nativeAsset.iconUrl ?? undefined : undefined,
    decimals: nativeAsset.decimals,
    chainId,
  };

  return nativeSourceTokenFormatted;
};

/**
 * Creates a BridgeToken from CAIP-19 format asset type
 * Used for parsing deep link parameters and other CAIP-19 formatted asset references
 *
 * @param caipAssetType - The CAIP-19 formatted asset type string
 * @returns BridgeToken object or null if parsing fails
 *
 * @example
 * // Native token
 * createTokenFromCaip('eip155:1/slip44:60') // Returns native ETH token
 *
 * // ERC20 token
 * createTokenFromCaip('eip155:1/erc20:0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4')
 *
 * // Solana token
 * createTokenFromCaip('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/spltoken:4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R')
 */
export const createTokenFromCaip = (
  caipAssetType: string,
): BridgeToken | null => {
  try {
    if (!isCaipAssetType(caipAssetType)) {
      return null;
    }

    const parsedAsset = parseCaipAssetType(caipAssetType);
    const {
      assetNamespace,
      assetReference,
      chainId: tokenChainId,
    } = parsedAsset;

    // Handle native tokens (slip44 namespace)
    if (assetNamespace === 'slip44') {
      return getNativeSourceToken(tokenChainId);
    }

    // Handle token assets (erc20, spltoken, etc.)
    const isEvmChain = tokenChainId.startsWith('eip155:');

    let tokenAddress: string;
    if (isEvmChain) {
      // For EVM chains, always normalize to checksum format to ensure consistent comparisons
      const checksumAddress = safeToChecksumAddress(assetReference);
      // Fall back to original address if checksum fails
      tokenAddress = checksumAddress ?? assetReference;
    } else {
      // For non-EVM chains (like Solana), store full CAIP format
      tokenAddress = caipAssetType;
    }

    return {
      address: tokenAddress,
      symbol: '', // Will be fetched later
      name: '',
      decimals: 18, // Default, will be updated
      chainId: tokenChainId,
    };
  } catch (error) {
    return null;
  }
};
