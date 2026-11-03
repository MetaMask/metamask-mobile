import { formatChainIdToCaip } from '@metamask/bridge-controller';
import { parseCaipAssetType, type Hex } from '@metamask/utils';
import { zeroAddress } from 'ethereumjs-util';
import { safeToChecksumAddress } from '../../../../util/address';
import { TokenI } from '../../Tokens/types';
import { TokenDetails } from '../TokenDetails/TokenDetails';

export const getTokenDetails = (
  asset: TokenI,
  isNonEvmAsset: boolean,
  tokenContractAddress: string | undefined,
): TokenDetails => {
  if (isNonEvmAsset) {
    // Use the same approach as useTokenHistoricalPrices
    const isCaipAssetType = asset.address.startsWith(`${asset.chainId}`);

    // Ensure we have proper CAIP format address for parsing
    const normalizedCaipAssetTypeAddress = isCaipAssetType
      ? asset.address
      : `${asset.chainId}/token:${asset.address}`;

    const { assetNamespace, assetReference } = parseCaipAssetType(
      normalizedCaipAssetTypeAddress as `${string}:${string}/${string}:${string}`,
    );
    const isNative = assetNamespace === 'slip44';
    return {
      contractAddress: isNative ? null : assetReference || null,
      tokenDecimal: asset.decimals || null,
      tokenList: asset?.aggregators?.join(', ') || null,
    };
  }

  if (asset.isETH) {
    return {
      contractAddress: zeroAddress(),
      tokenDecimal: 18,
      tokenList: '',
    };
  }
  return {
    contractAddress: tokenContractAddress ?? null,
    tokenDecimal: asset.decimals ?? null,
    tokenList: Array.isArray(asset.aggregators)
      ? asset.aggregators.join(', ')
      : null,
  };
};

export const resolveTokenContractAddress = (asset: TokenI): string | null => {
  // `chainId` is optional on `TokenI`, and the formatter below reads it
  // unconditionally. Without a chain there is nothing to tell an EVM address
  // apart from a CAIP-19 asset id, so there is no address to resolve either.
  if (!asset.chainId) {
    return null;
  }

  const resultChainId = formatChainIdToCaip(asset.chainId as Hex);
  const isNonEvmAsset = resultChainId === asset.chainId;
  const tokenContractAddress = !isNonEvmAsset
    ? safeToChecksumAddress(asset.address)
    : asset.address;

  return getTokenDetails(asset, isNonEvmAsset, tokenContractAddress)
    .contractAddress;
};
