import { useMemo } from 'react';
import { useTradablePerpsMarketSymbols } from '../../../../UI/WhatsHappening/hooks';
import { getSupportedXyzPerpMarketSymbol } from '../../utils/perp';

export interface PerpMarketNavigationTarget {
  /** The resolved `xyz` market symbol to navigate to. */
  targetSymbol: string;
  /** True when the market is supported and safe to navigate to. */
  isSupported: boolean;
}

/**
 * Resolves a perp position's raw symbol to the `xyz` HIP-3 market we support
 * and reports whether that market is tradable. Single source of truth shared by
 * the Trade CTA and the header token link so both resolve identically.
 *
 * We only support trading `xyz` HIP-3 markets. `xyz`/non-HIP-3 symbols link
 * directly; other HIP-3 providers (e.g. `cash:SPCX`) are remapped to their
 * `xyz` equivalent (`xyz:SPCX`) and are only tradable when that market exists.
 *
 * Must be used inside a {@link PerpsStreamProvider} — the market-data
 * subscription that backs the existence check lives there.
 */
export function usePerpMarketNavigationTarget(
  symbol: string,
): PerpMarketNavigationTarget {
  const { tradableSymbols } = useTradablePerpsMarketSymbols();

  return useMemo(() => {
    const resolved = getSupportedXyzPerpMarketSymbol(symbol);
    // An empty set means the market list hasn't arrived yet (per the hook's
    // contract) — not that no markets are tradable. `usePerpsMarkets` can
    // report `isLoading: false` with an empty list while a fetch is still in
    // flight (or when an empty controller cache is treated as preloaded), so
    // we key off the set being empty rather than the loading flag to avoid a
    // false, sticky "Unsupported market". The perps list is never legitimately
    // empty (BTC/ETH always present), so an empty set reliably means "unknown".
    return {
      targetSymbol: resolved.targetSymbol,
      isSupported:
        !resolved.requiresXyzMarketCheck ||
        tradableSymbols.size === 0 ||
        tradableSymbols.has(resolved.targetSymbol),
    };
  }, [symbol, tradableSymbols]);
}
