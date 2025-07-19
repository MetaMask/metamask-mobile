import { useCallback, useEffect, useState } from 'react';
import type { PriceUpdate } from '../controllers/types';
import { useStableArray } from './useStableArray';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from './index';

/**
 * Hook for live price updates (bypasses Redux for performance)
 */
export function usePerpsPrices(
  symbols: string[],
  includeOrderBook = false,
): Record<string, PriceUpdate> {
  const { subscribeToPrices } = usePerpsTrading();
  const { isInitialized } = usePerpsConnection();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  const memoizedCallback = useCallback((newPrices: PriceUpdate[]) => {
    setPrices((prev) => {
      const updated = { ...prev };
      newPrices.forEach((price) => {
        updated[price.coin] = price;
      });
      return updated;
    });
  }, []);

  const stableSymbols = useStableArray(symbols);

  useEffect(() => {
    if (stableSymbols.length === 0 || !isInitialized) return;

    const unsubscribe = subscribeToPrices({
      symbols: stableSymbols,
      callback: memoizedCallback,
      includeOrderBook,
    });
    return unsubscribe;
  }, [
    stableSymbols,
    subscribeToPrices,
    memoizedCallback,
    isInitialized,
    includeOrderBook,
  ]);

  return prices;
}
