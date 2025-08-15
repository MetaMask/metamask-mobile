import { useCallback, useEffect, useState, useRef } from 'react';
import type { PriceUpdate } from '../controllers/types';
import { useStableArray } from './useStableArray';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from './index';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';

/**
 * Configuration options for the usePerpsPrices hook
 */
export interface UsePerpsPricesOptions {
  /** Whether to include order book data (bid/ask) */
  includeOrderBook?: boolean;
  /** Debounce delay in milliseconds (default: 50ms) */
  debounceMs?: number;
  /** Whether to include market data (funding, OI, volume) */
  includeMarketData?: boolean;
}

/**
 * Hook for live price updates with debouncing (bypasses Redux for performance)
 * Batches rapid price updates to reduce re-renders
 * @param symbols - Array of symbols to subscribe to
 * @param options - Optional configuration object
 */
export function usePerpsPrices(
  symbols: string[],
  options: UsePerpsPricesOptions = {},
): Record<string, PriceUpdate> {
  const {
    includeOrderBook = false,
    debounceMs,
    includeMarketData = false,
  } = options;

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

  // Use provided debounce or fall back to default
  const debounceDelay =
    debounceMs ?? PERFORMANCE_CONFIG.PRICE_UPDATE_DEBOUNCE_MS;

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
      }, debounceDelay);
    },
    [flushPendingUpdates, debounceDelay],
  );

  const stableSymbols = useStableArray(symbols);

  useEffect(() => {
    if (stableSymbols.length === 0 || !isInitialized) return;

    const unsubscribe = subscribeToPrices({
      symbols: stableSymbols,
      callback: memoizedCallback,
      includeOrderBook,
      includeMarketData,
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
    includeMarketData,
    flushPendingUpdates,
  ]);

  return prices;
}
