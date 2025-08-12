import { useCallback, useEffect, useState, useRef } from 'react';
import type { PriceUpdate } from '../controllers/types';
import { useStableArray } from './useStableArray';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from './index';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';

/**
 * Hook for live price updates with debouncing (bypasses Redux for performance)
 * Batches rapid price updates to reduce re-renders
 */
export function usePerpsPrices(
  symbols: string[],
  includeOrderBook = false,
): Record<string, PriceUpdate> {
  const { subscribeToPrices } = usePerpsTrading();
  const { isInitialized } = usePerpsConnection();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  // Use refs to track pending updates and debounce timer
  const pendingUpdatesRef = useRef<Map<string, PriceUpdate>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushPendingUpdates = useCallback(() => {
    if (pendingUpdatesRef.current.size > 0) {
      setPrices((prev) => {
        let hasChanges = false;
        const updated = { ...prev };

        pendingUpdatesRef.current.forEach((price, coin) => {
          const existingPrice = prev[coin];
          // Check if price has actually changed
          if (
            !existingPrice ||
            existingPrice.price !== price.price ||
            existingPrice.bestBid !== price.bestBid ||
            existingPrice.bestAsk !== price.bestAsk
          ) {
            updated[coin] = price;
            hasChanges = true;
          }
        });

        // Only return new object if there were actual changes
        return hasChanges ? updated : prev;
      });
      pendingUpdatesRef.current.clear();
    }
  }, []);

  const memoizedCallback = useCallback(
    (newPrices: PriceUpdate[]) => {
      // Store updates in pending map
      newPrices.forEach((price) => {
        pendingUpdatesRef.current.set(price.coin, price);
      });

      // Clear existing timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        flushPendingUpdates();
        debounceTimerRef.current = null;
      }, PERFORMANCE_CONFIG.PRICE_UPDATE_DEBOUNCE_MS);
    },
    [flushPendingUpdates],
  );

  const stableSymbols = useStableArray(symbols);

  useEffect(() => {
    if (stableSymbols.length === 0 || !isInitialized) return;

    const unsubscribe = subscribeToPrices({
      symbols: stableSymbols,
      callback: memoizedCallback,
      includeOrderBook,
    });

    return () => {
      // Cleanup: flush any pending updates and clear timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        flushPendingUpdates();
      }
      unsubscribe();
    };
  }, [
    stableSymbols,
    subscribeToPrices,
    memoizedCallback,
    isInitialized,
    includeOrderBook,
    flushPendingUpdates,
  ]);

  return prices;
}
