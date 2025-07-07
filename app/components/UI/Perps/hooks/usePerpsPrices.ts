import { useCallback, useEffect, useState } from 'react';
import type { PriceUpdate } from '../controllers/types';
import { useStableArray } from './useStableArray';
import { usePerpsController } from './usePerpsController';

/**
 * Hook for live price updates (bypasses Redux for performance)
 * Updates directly from WebSocket without going through Redux
 */
export function usePerpsPrices(symbols: string[]): Record<string, PriceUpdate> {
  const { subscribeToPrices } = usePerpsController();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  // Create stable callback - receives individual price updates from singleton subscriptions
  const memoizedCallback = useCallback((newPrices: PriceUpdate[]) => {
    // Direct UI update, bypasses Redux for maximum performance
    setPrices(prev => {
      const updated = { ...prev };
      newPrices.forEach(price => {
        updated[price.coin] = price;
      });
      return updated;
    });
  }, []);

  // Create stable symbols array to prevent infinite re-renders
  const stableSymbols = useStableArray(symbols);

  useEffect(() => {
    if (stableSymbols.length === 0) return;

    // Subscribe to cached price feeds from singleton WebSocket subscriptions
    const unsubscribe = subscribeToPrices({
      symbols: stableSymbols,
      callback: memoizedCallback,
    });
    return unsubscribe;
  }, [stableSymbols, subscribeToPrices, memoizedCallback]);

  return prices;
}
