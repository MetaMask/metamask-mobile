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
  // Check if asset has positive fiat balance
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

  // Priority 1: Find highest USD value token on same chain (with positive balance)
  // Note: assetId contains the token address for EVM assets
  const sameChainAssets = userAssets
    .filter((asset) => asset.chainId === destinationChainId)
    .sort(
      (first, second) =>
        (second.fiat?.balance ?? 0) - (first.fiat?.balance ?? 0),
    );

  if (sameChainAssets[0]) {
    return toBridgeToken(sameChainAssets[0]);
  }

  // Eligible cross-chain assets: exclude exact same token (address + chain match)
  // This allows cross-chain bridging of native tokens that share the zero address
  const crossChainAssets = userAssets
    .filter((asset) => asset.chainId !== destinationChainId)
    .sort(
      (first, second) =>
        (second.fiat?.balance ?? 0) - (first.fiat?.balance ?? 0),
    );

  // Priority 2: Prefer native tokens (ETH, POL, etc.) with highest fiat balance
  const nativeAsset = crossChainAssets.find((asset) => asset.isNative);

  if (nativeAsset) {
    return toBridgeToken(nativeAsset);
  }

  // Priority 3 – Last swapped token (needs selector/data source)
  // Priority 4 – Most used token (needs selector/data source)

  // Fallback: highest USD value token on any chain
  if (crossChainAssets[0]) {
    return toBridgeToken(crossChainAssets[0]);
  }

  // No eligible tokens found - return null to trigger on-ramp flow
  return null;
};
