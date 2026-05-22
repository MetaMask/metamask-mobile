import { useMemo } from 'react';
import type { RelatedAsset } from '@metamask/ai-controllers';
import { usePerpsLivePrices } from '../../../UI/Perps/hooks/stream';

export interface PerpsPriceEntry {
  price: number | undefined;
  percentChange24h: number | undefined;
}

export interface UseWhatsHappeningAssetPricesResult {
  /** Map from HyperLiquid perps symbol → price data */
  perpsPriceBySymbol: Record<string, PerpsPriceEntry>;
}

/**
 * Returns live price data for every perps market referenced by the given
 * related assets. Prices come from the WebSocket stream via
 * `usePerpsLivePrices` and are throttled to 3 s to limit re-renders.
 *
 * Assets without an `hlPerpsMarket` entry are ignored.
 */
export function useWhatsHappeningAssetPrices(
  assets: RelatedAsset[],
): UseWhatsHappeningAssetPricesResult {
  const perpsSymbols = useMemo(
    () => [...new Set(assets.flatMap((a) => a.hlPerpsMarket ?? []))],
    [assets],
  );

  const livePerpsPrices = usePerpsLivePrices({
    symbols: perpsSymbols,
    throttleMs: 3000,
  });

  const perpsPriceBySymbol = useMemo<Record<string, PerpsPriceEntry>>(() => {
    const map: Record<string, PerpsPriceEntry> = {};
    for (const symbol of perpsSymbols) {
      const liveEntry = livePerpsPrices[symbol];
      if (!liveEntry) {
        map[symbol] = { price: undefined, percentChange24h: undefined };
        continue;
      }
      const rawPrice = parseFloat(liveEntry.price);
      const rawChange = liveEntry.percentChange24h
        ? parseFloat(liveEntry.percentChange24h)
        : undefined;
      map[symbol] = {
        price: isNaN(rawPrice) ? undefined : rawPrice,
        percentChange24h:
          rawChange !== undefined && isNaN(rawChange) ? undefined : rawChange,
      };
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perpsSymbols, livePerpsPrices]);

  return { perpsPriceBySymbol };
}
