import { useMemo, useRef } from 'react';
import { useIsFocused } from '@react-navigation/native';
import type { RelatedAsset } from '@metamask/ai-controllers';
import type { PriceUpdate } from '@metamask/perps-controller';
import { usePerpsLivePrices } from '../../../UI/Perps/hooks/stream';

export interface PerpsPriceEntry {
  price: number | undefined;
  percentChange24h: number | undefined;
}

export interface UseWhatsHappeningAssetPricesResult {
  /** Map from HyperLiquid perps symbol → price data */
  perpsPriceBySymbol: Record<string, PerpsPriceEntry>;
}

const NO_SYMBOLS: string[] = [];

const EMPTY_PRICE_ENTRY: PerpsPriceEntry = {
  price: undefined,
  percentChange24h: undefined,
};

function parseLivePriceEntry(
  liveEntry: PriceUpdate | undefined,
): PerpsPriceEntry {
  if (!liveEntry) {
    return EMPTY_PRICE_ENTRY;
  }

  const rawPrice = parseFloat(liveEntry.price);
  const rawChange = liveEntry.percentChange24h
    ? parseFloat(liveEntry.percentChange24h)
    : undefined;

  return {
    price: Number.isNaN(rawPrice) ? undefined : rawPrice,
    percentChange24h:
      rawChange !== undefined && Number.isNaN(rawChange)
        ? undefined
        : rawChange,
  };
}

function hasFinitePrice(entry: PerpsPriceEntry): boolean {
  return entry.price !== undefined && Number.isFinite(entry.price);
}

/**
 * Returns live price data for every perps market referenced by the given
 * related assets. Prices come from the WebSocket stream via
 * `usePerpsLivePrices` and are throttled to 3 s to limit re-renders.
 *
 * `usePerpsLivePrices` replaces its map on every tick, and ticks are often
 * partial (only symbols that changed). This hook keeps last-known finite
 * prices so omitted symbols do not flash empty.
 *
 * Assets without an `hlPerpsMarket` entry are ignored.
 */
export function useWhatsHappeningAssetPrices(
  assets: RelatedAsset[],
): UseWhatsHappeningAssetPricesResult {
  const isFocused = useIsFocused();
  const perpsSymbols = useMemo(
    () => [...new Set(assets.flatMap((a) => a.hlPerpsMarket ?? []))],
    [assets],
  );

  // Pass an empty symbol list instead of an `enabled` flag so the shared
  // `usePerpsLivePrices` hook (used by call sites that always want to stay
  // subscribed, e.g. order views) doesn't need its own gating support. This
  // freezes the last known prices in place rather than clearing them, so
  // the detail view doesn't blank out if it stays mounted below a pushed
  // screen while unfocused.
  const subscribedSymbols = isFocused ? perpsSymbols : NO_SYMBOLS;

  const livePerpsPrices = usePerpsLivePrices({
    symbols: subscribedSymbols,
    throttleMs: 3000,
  });

  const lastKnownBySymbolRef = useRef<Record<string, PerpsPriceEntry>>({});

  const perpsPriceBySymbol = useMemo<Record<string, PerpsPriceEntry>>(() => {
    const map: Record<string, PerpsPriceEntry> = {};
    const nextKnown: Record<string, PerpsPriceEntry> = {};

    for (const symbol of perpsSymbols) {
      const parsed = parseLivePriceEntry(livePerpsPrices[symbol]);
      const resolved = hasFinitePrice(parsed)
        ? parsed
        : (lastKnownBySymbolRef.current[symbol] ?? parsed);
      map[symbol] = resolved;
      if (hasFinitePrice(resolved)) {
        nextKnown[symbol] = resolved;
      }
    }

    lastKnownBySymbolRef.current = nextKnown;
    return map;
  }, [perpsSymbols, livePerpsPrices]);

  return { perpsPriceBySymbol };
}
