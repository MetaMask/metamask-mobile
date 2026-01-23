import { zeroAddress } from 'ethereumjs-util';
import { TokenI } from '../../../../Tokens/types';
import { TokenDetails } from '../TokenDetails/TokenDetails';
import { parseCaipAssetType } from '@metamask/utils';

export const getTokenDetails = (
  asset: TokenI,
  isNonEvmAsset: boolean,
  tokenContractAddress: string | undefined,
  tokenMetadata: Record<string, string | number | string[]>,
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
    tokenDecimal:
      typeof tokenMetadata?.decimals === 'number'
        ? tokenMetadata.decimals
        : (asset.decimals ?? null),
    tokenList: Array.isArray(tokenMetadata?.aggregators)
      ? tokenMetadata.aggregators.join(', ')
      : null,
  };
};
