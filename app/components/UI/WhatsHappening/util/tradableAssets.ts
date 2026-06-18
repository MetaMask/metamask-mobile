import type { RelatedAsset } from '@metamask/ai-controllers';

/**
 * Returns true when the asset should be displayed as a tradable perps asset.
 *
 * Assets without an `hlPerpsMarket` mapping are NOT perps assets and are
 * always considered displayable (this predicate does not gate them).
 * Assets that DO have an `hlPerpsMarket` mapping are only shown when their
 * first market symbol is present in `tradableSymbols`, which is derived from
 * the canonical perps guardrail (filterAndSortMarkets via usePerpsMarkets).
 *
 * This intentionally performs NO volume/open-interest logic — tradability is
 * determined entirely by membership in the already-filtered market set.
 */
export function isRelatedAssetTradable(
  asset: RelatedAsset,
  tradableSymbols: Set<string>,
): boolean {
  const perpsSymbol = asset.hlPerpsMarket?.[0];
  if (!perpsSymbol) {
    return true;
  }
  return tradableSymbols.has(perpsSymbol);
}
