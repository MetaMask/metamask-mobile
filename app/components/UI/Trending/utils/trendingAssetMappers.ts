import { TrendingAsset } from '@metamask/assets-controllers';
import {
  CaipChainId,
  Hex,
  isCaipChainId,
  parseCaipChainId,
} from '@metamask/utils';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../constants/bridge';
import { getTrendingTokenImageUrl } from './getTrendingTokenImageUrl';
import { TokenDetailsSource } from '../../TokenDetails/constants/constants';

export interface TrendingAssetNavigationParams {
  chainId: Hex;
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  image: string;
  pricePercentChange1d?: number;
  isNative: boolean;
  isETH: boolean;
  isFromTrending: boolean;
  source: TokenDetailsSource.Trending;
  rwaData?: TrendingAsset['rwaData'];
}

const caipChainIdToHex = (caipChainId: CaipChainId): Hex => {
  const { namespace, reference } = parseCaipChainId(caipChainId);
  return namespace === 'eip155'
    ? (`0x${Number(reference).toString(16)}` as Hex)
    : (caipChainId as Hex);
};

const getAddressFromAssetIdentifier = (
  assetIdentifier: string | undefined,
): { address: string; isNativeToken: boolean } | null => {
  if (!assetIdentifier) {
    return null;
  }

  const isNativeToken = assetIdentifier.startsWith('slip44:');
  if (isNativeToken) {
    return { address: NATIVE_SWAPS_TOKEN_ADDRESS, isNativeToken: true };
  }

  const [, address] = assetIdentifier.split(':');
  if (!address) {
    return null;
  }

  return { address, isNativeToken: false };
};

export const getTrendingAssetNavigationParams = (
  token: TrendingAsset,
): TrendingAssetNavigationParams | null => {
  const [caipChainId, assetIdentifier] = token.assetId.split('/');
  if (!isCaipChainId(caipChainId)) {
    return null;
  }

  const addressResult = getAddressFromAssetIdentifier(assetIdentifier);
  if (!addressResult) {
    return null;
  }

  const hexChainId = caipChainIdToHex(caipChainId);
  const isEvmChain = caipChainId.startsWith('eip155:');

  return {
    chainId: hexChainId,
    address: isEvmChain ? addressResult.address : token.assetId,
    symbol: token.symbol,
    name: token.name,
    decimals: token.decimals,
    image: getTrendingTokenImageUrl(token.assetId),
    pricePercentChange1d: token.priceChangePct?.h24
      ? parseFloat(token.priceChangePct.h24)
      : undefined,
    isNative: addressResult.isNativeToken,
    isETH: addressResult.isNativeToken && hexChainId === '0x1',
    isFromTrending: true,
    source: TokenDetailsSource.Trending,
    rwaData: token.rwaData,
  };
};
