import type { CaipChainId, Hex } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import type { BridgeToken } from '../types';

export interface BuySourceAsset {
  chainId: string;
  assetId: string;
  isNative?: boolean;
  decimals: number;
  symbol: string;
  name: string;
  image?: string;
  fiat?: { balance?: number };
}

export type BuySourceAssetEligibility = (asset: BuySourceAsset) => boolean;

const hasPositiveFiatBalance = (asset: BuySourceAsset): boolean =>
  (asset.fiat?.balance ?? 0) > 0;

const toBridgeToken = (asset: BuySourceAsset): BridgeToken => ({
  address: asset.assetId,
  chainId: asset.chainId as Hex | CaipChainId,
  decimals: asset.decimals,
  symbol: asset.symbol,
  name: asset.name,
  image: asset.image,
});

/**
 * Selects the preferred held token to spend when acquiring another token.
 *
 * Priority:
 * 1. Highest fiat-value token on the destination chain.
 * 2. Highest fiat-value native token on another chain.
 * 3. Highest fiat-value token on any other chain.
 *
 * @param userAssetsMap - Assets held by the selected account group.
 * @param destinationChainId - Chain containing the token being acquired.
 * @param destinationAddress - Address of the token being acquired.
 * @param isEligible - Optional caller policy for excluding unsupported sources.
 * @returns Preferred source token, or null when no eligible funded source exists.
 */
export const computeBuySourceToken = (
  userAssetsMap: Record<string, BuySourceAsset[]> | undefined,
  destinationChainId: string | undefined,
  destinationAddress: string,
  isEligible: BuySourceAssetEligibility = () => true,
): BridgeToken | null => {
  const userAssets = Object.values(userAssetsMap ?? {})
    .flat()
    .filter(
      (asset) =>
        hasPositiveFiatBalance(asset) &&
        isEligible(asset) &&
        !(
          areAddressesEqual(asset.assetId, destinationAddress) &&
          asset.chainId === destinationChainId
        ),
    );

  const sameChainAssets = userAssets
    .filter((asset) => asset.chainId === destinationChainId)
    .sort(
      (first, second) =>
        (second.fiat?.balance ?? 0) - (first.fiat?.balance ?? 0),
    );

  if (sameChainAssets[0]) {
    return toBridgeToken(sameChainAssets[0]);
  }

  const crossChainAssets = userAssets
    .filter((asset) => asset.chainId !== destinationChainId)
    .sort(
      (first, second) =>
        (second.fiat?.balance ?? 0) - (first.fiat?.balance ?? 0),
    );
  const nativeAsset = crossChainAssets.find((asset) => asset.isNative);

  return nativeAsset
    ? toBridgeToken(nativeAsset)
    : crossChainAssets[0]
      ? toBridgeToken(crossChainAssets[0])
      : null;
};
