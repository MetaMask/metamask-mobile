import type { Asset } from '@metamask/assets-controller';
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
   * those chains are considered for the placeholder check.
   */
  allowedChainIds?: readonly string[];
  /**
   * When true, only mUSD rows are considered (Cash / Money hub list).
   */
  musdOnly?: boolean;
}

const flattenAssets = (
  assetsByChain: AssetsByChain,
  allowedChainIds?: readonly string[],
): Asset[] => {
  const entries = Object.entries(assetsByChain);
  const filteredEntries =
    allowedChainIds && allowedChainIds.length > 0
      ? entries.filter(([chainId]) => allowedChainIds.includes(chainId))
      : entries;

  return filteredEntries.flatMap(([, assets]) => assets ?? []);
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
