import type { CardFundingAsset } from '../../../../core/Engine/controllers/card-controller/provider-types';

/**
 * Reorders assets so that the selected asset is priority 1 and the rest
 * are renumbered sequentially. Returns a new sorted array.
 */
export function reorderAssets(
  selected: CardFundingAsset,
  allAssets: CardFundingAsset[],
): CardFundingAsset[] {
  let nextPriority = 2;
  return allAssets
    .map((a) => ({
      ...a,
      priority:
        a.walletAddress === selected.walletAddress &&
        a.symbol.toLowerCase() === selected.symbol.toLowerCase() &&
        a.chainId === selected.chainId
          ? 1
          : nextPriority++,
    }))
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Picks the primary asset from an ordered array. Prefers the first asset
 * with a positive balance; falls back to the first asset overall.
 */
export function pickPrimaryFromReordered(
  assets: CardFundingAsset[],
): CardFundingAsset | null {
  if (assets.length === 0) return null;
  const first = assets[0];
  if (parseFloat(first.balance) > 0) return first;
  return assets.find((a) => parseFloat(a.balance) > 0) ?? first;
}
