import {
  CaipChainId,
  Hex,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';
import {
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { safeToChecksumAddress } from '../../../../util/address';
import { toHex } from '@metamask/controller-utils';
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

/**
 * Creates a BridgeToken from CAIP-19 format asset type
 *
 * @example
 * createTokenFromCaip('eip155:1/slip44:60') // Native ETH token
 * createTokenFromCaip('eip155:1/erc20:0xa0b86a33e6776d02b5c07b4e92b1b3a8e1b9b1a4') // ERC20 token
 * createTokenFromCaip('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R') // Solana token
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

    // Handle native tokens
    if (assetNamespace === 'slip44') {
      return getNativeSourceToken(tokenChainId);
    }

    let tokenAddress: string;
    let formattedChainId: Hex | CaipChainId;

    if (tokenChainId.startsWith('eip155:')) {
      // EVM chains: use checksum address and hex chain ID
      const checksumAddress = safeToChecksumAddress(assetReference);
      tokenAddress = checksumAddress ?? assetReference;
      const { reference } = parseCaipChainId(tokenChainId);
      formattedChainId = toHex(reference) as Hex;
    } else {
      // Non-EVM chains: use full CAIP format for native tokens, raw address for others
      if (assetNamespace === 'slip44') {
        // For native tokens, use the full CAIP asset type to match multichain balances
        tokenAddress = caipAssetType;
      } else {
        // For other tokens (like SPL tokens), use the raw address
        tokenAddress = assetReference;
      }
      formattedChainId = tokenChainId;
    }

    return {
      address: tokenAddress,
      symbol: '', // Will be fetched later
      name: '',
      decimals: 18, // Default, will be updated
      chainId: formattedChainId,
      balance: '0',
    };
  } catch (error) {
    return null;
  }
};
