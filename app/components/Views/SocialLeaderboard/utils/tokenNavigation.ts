import {
  type CaipAssetType,
  type CaipChainId,
  isCaipAssetType,
  parseCaipAssetType,
  parseCaipChainId,
} from '@metamask/utils';

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
 * Parses a CAIP-19 asset id into the params the wallet's `Asset` (token
 * details) route expects. Mirrors the local helper in
 * `Homepage/Sections/Tokens/components/PopularTokenRow.tsx` so a SocialLeaderboard
 * spot position can open the same token page — keep the two in sync.
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
      chainId = `0x${parseInt(chainReference, 10).toString(16)}`;
      address = isNative ? NATIVE_TOKEN_ADDRESS : assetReference;
    } else {
      chainId = `${namespace}:${chainReference}`;
      address = assetId;
    }

    return { chainId, address, isEvmChain, isNative };
  } catch {
    return empty;
  }
}
