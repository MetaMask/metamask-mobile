import {
  CaipAssetType,
  parseCaipChainId,
  CaipAssetTypeStruct,
  CaipChainId,
  Hex,
  isCaipAssetType,
  isCaipChainId,
  isStrictHexString,
  parseCaipAssetType,
} from '@metamask/utils';

import { toEvmCaipChainId } from '@metamask/multichain-network-controller';
import { MultichainNetwork } from '@metamask/multichain-transactions-controller';
import { handleFetch } from '@metamask/controller-utils';
import {
  formatAddressToCaipReference,
  formatChainIdToHex,
  isNonEvmChainId,
} from '@metamask/bridge-controller';

const TOKEN_API_V3_BASE_URL = 'https://tokens.api.cx.metamask.io/v3';
const STATIC_METAMASK_BASE_URL = 'https://static.cx.metamask.io';

export const toAssetId = (
  address: Hex | CaipAssetType | string,
  chainId: CaipChainId,
): CaipAssetType | undefined => {
  if (isCaipAssetType(address)) {
    return address;
  } else if (chainId === MultichainNetwork.Solana) {
    return CaipAssetTypeStruct.create(`${chainId}/token:${address}`);
  }
  // EVM assets
  if (!isStrictHexString(address)) {
    return undefined;
  }
  return CaipAssetTypeStruct.create(`${chainId}/erc20:${address}`);
};

/**
 * Returns the image url for a caip-formatted asset
 *
 * @param assetId - The hex address or caip-formatted asset id
 * @param chainId - The chainId in caip or hex format
 * @returns The image url for the asset
 */
export const getAssetImageUrl = (
  assetId: CaipAssetType | string,
  chainId: CaipChainId | Hex,
) => {
  const chainIdInCaip = isCaipChainId(chainId)
    ? chainId
    : toEvmCaipChainId(chainId);

  const assetIdInCaip = toAssetId(assetId, chainIdInCaip);
  if (!assetIdInCaip) {
    return undefined;
  }

  return `${STATIC_METAMASK_BASE_URL}/api/v2/tokenIcons/assets/${assetIdInCaip
    .split(':')
    .join('/')}.png`;
};

interface AssetMetadata {
  assetId: string;
  symbol: string;
  name: string;
  decimals: number;
}

/**
 * Fetches the metadata for a token
 *
 * @param address - The address of the token
 * @param chainId - The chainId of the token
 * @param abortSignal - The abort signal for the fetch request
 * @returns The metadata for the token
 */
export const fetchAssetMetadata = async (
  address: string | CaipAssetType | Hex,
  chainId: Hex | CaipChainId,
) => {
  const chainIdInCaip = isCaipChainId(chainId)
    ? chainId
    : toEvmCaipChainId(chainId);

  const assetId = toAssetId(address, chainIdInCaip);

  if (!assetId) {
    return undefined;
  }

  try {
    const url = `${TOKEN_API_V3_BASE_URL}/assets?assetIds=${assetId}`;
    const [assetMetadata]: AssetMetadata[] = await handleFetch(url);

    const commonFields = {
      symbol: assetMetadata.symbol,
      decimals: assetMetadata.decimals,
      name: assetMetadata.name,
      image: getAssetImageUrl(assetId, chainIdInCaip),
      assetId,
    };

    // non-EVM
    if (isNonEvmChainId(chainId) && assetId) {
      const { assetReference } = parseCaipAssetType(assetId);
      return {
        ...commonFields,
        address: assetReference,
        assetId,
        chainId,
      };
    }

    // EVM
    const { reference } = parseCaipChainId(chainIdInCaip);

    return {
      ...commonFields,
      // This is the EVM hex address of the token
      address: formatAddressToCaipReference(address),
      chainId: formatChainIdToHex(reference),
    };
  } catch (error) {
    return undefined;
  }
};
