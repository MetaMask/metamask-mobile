import {
  type CaipAssetType,
  type CaipChainId,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';

// Zero address used for native EVM tokens (ETH, BNB, etc.)
const NATIVE_TOKEN_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface AssetNavigationParams {
  /** Hex chainId for EVM chains, CAIP-2 chainId for non-EVM. */
  chainId: string;
  /** ERC-20 contract address (EVM), zero address for native, or the CAIP-19 id (non-EVM). */
  address: string;
  isEvmChain: boolean;
  isNative: boolean;
}

/**
 * Parses a CAIP-19 asset id into the params the `Asset` (token details) route
 * expects. Owned by TokenDetails as the destination's contract — any feature
 * that opens the token page from a CAIP-19 asset id should use this instead of
 * re-deriving the param shape locally.
 *
 * @param assetId - CAIP-19 asset id (e.g. "eip155:1/erc20:0x123...")
 * @returns Parsed asset info with chainId, address, and type flags; empty
 * strings and false flags when the asset id is not a valid CAIP-19 id.
 */
export function parseAssetIdForNavigation(
  assetId: string,
): AssetNavigationParams {
  const empty: AssetNavigationParams = {
    chainId: '',
    address: '',
    isEvmChain: false,
    isNative: false,
  };

  if (!isCaipAssetType(assetId as CaipAssetType)) {
    return empty;
  }

  try {
    const parsedAsset = parseCaipAssetType(assetId as CaipAssetType);
    const parsedChain = parseCaipChainId(parsedAsset.chainId as CaipChainId);

    const { namespace, reference: chainReference } = parsedChain;
    const { assetNamespace, assetReference } = parsedAsset;

    const isEvmChain = namespace === 'eip155';
    const isNative = assetNamespace === 'slip44';

    let chainId: string;
    let address: string;

    if (isEvmChain) {
      // EVM chains use hex chainId format for navigation
      chainId = `0x${parseInt(chainReference, 10).toString(16)}`;
      // For native tokens (slip44), use zero address; for ERC20, use the contract address
      address = isNative ? NATIVE_TOKEN_ADDRESS : assetReference;
    } else {
      // Non-EVM chains use CAIP-2 format for chainId
      chainId = `${namespace}:${chainReference}`;
      // For non-EVM chains, address is the full CAIP-19 asset ID
      address = assetId;
    }

    return { chainId, address, isEvmChain, isNative };
  } catch {
    return empty;
  }
}
