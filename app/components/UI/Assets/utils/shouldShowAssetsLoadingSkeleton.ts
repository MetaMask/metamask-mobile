import type { Asset } from '@metamask/assets-controller';
import { toHex } from '@metamask/controller-utils';
import type { Hex } from '@metamask/utils';
import { isMusdToken } from '../../Earn/constants/musd';

/**
 * Whether a balance-like value should be treated as unresolved / zero.
 */
export const isZeroAssetAmount = (value: unknown): boolean => {
  if (value === null || value === undefined || value === '') {
    return true;
  }

  const numericValue = typeof value === 'number' ? value : Number(value);
  return !Number.isFinite(numericValue) || numericValue === 0;
};

type AssetsByChain = Record<string, Asset[] | undefined>;

interface ShouldShowAssetsLoadingSkeletonArgs {
  assetsHaveLoaded: boolean;
  assetsByChain: AssetsByChain;
  /**
   * Optional chain allow-list (e.g. popular networks on home). When set, only
   * those chains are considered for the placeholder check. Accepts CAIP-2 or
   * Hex; EVM CAIP ids also match Hex asset map keys.
   */
  allowedChainIds?: readonly string[];
  /**
   * When true, only mUSD rows are considered (Cash / Money hub list).
   */
  musdOnly?: boolean;
}

/**
 * Builds a set of network IDs for filtering. Popular networks are often CAIP-2
 * while asset map keys may be Hex for EVM, so both forms are included.
 */
const buildAllowedNetworkIdSet = (chainIds: readonly string[]): Set<string> => {
  const allowedIds = new Set(chainIds);
  for (const id of chainIds) {
    if (id.startsWith('eip155:')) {
      const reference = id.slice(7);
      if (reference) {
        allowedIds.add(toHex(reference) as Hex);
      }
    }
  }
  return allowedIds;
};

const flattenAssets = (
  assetsByChain: AssetsByChain,
  allowedChainIds?: readonly string[],
): Asset[] => {
  const entries = Object.entries(assetsByChain);
  if (!allowedChainIds || allowedChainIds.length === 0) {
    return entries.flatMap(([, assets]) => assets ?? []);
  }

  const allowedIds = buildAllowedNetworkIdSet(allowedChainIds);
  return entries
    .filter(([chainId]) => allowedIds.has(chainId))
    .flatMap(([, assets]) => assets ?? []);
};

/**
 * Mirrors extension token-list soft-gating: keep skeletons while the load is
 * unsettled only when the list is empty or still just zero-value native / mUSD
 * placeholders. Returning users with real balances see rows immediately even
 * if background Snap/RPC work is still running.
 */
export const shouldShowAssetsLoadingSkeleton = ({
  assetsHaveLoaded,
  assetsByChain,
  allowedChainIds,
  musdOnly = false,
}: ShouldShowAssetsLoadingSkeletonArgs): boolean => {
  if (assetsHaveLoaded) {
    return false;
  }

  const assets = flattenAssets(assetsByChain, allowedChainIds).filter(
    (asset) => (musdOnly ? isMusdToken(asset.address ?? asset.assetId) : true),
  );

  return assets.every(
    (asset) =>
      (Boolean(asset.isNative) ||
        isMusdToken(asset.address ?? asset.assetId)) &&
      isZeroAssetAmount(asset.balance) &&
      isZeroAssetAmount(asset.fiat?.balance),
  );
};
