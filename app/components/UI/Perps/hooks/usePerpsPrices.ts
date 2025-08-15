import { useCallback, useEffect, useState, useRef } from 'react';
import type { PriceUpdate } from '../controllers/types';
import { useStableArray } from './useStableArray';
import { usePerpsTrading } from './usePerpsTrading';
import { usePerpsConnection } from '../providers/PerpsConnectionProvider';
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
    const pendingCount = pendingUpdatesRef.current.size;
    if (pendingCount === 0) {
      return;
    }

    // Capture the pending updates before clearing
    const pendingUpdates = Array.from(pendingUpdatesRef.current.entries());

    // Clear immediately to avoid double processing
    pendingUpdatesRef.current.clear();

    setPrices((prev) => {
      const updated = { ...prev };

      // Always update with pending prices when flushing
      pendingUpdates.forEach(([coin, price]) => {
        updated[coin] = price;
      });

      return updated;
    });
  }, []);

  // Use provided debounce or fall back to default
  const debounceDelay =
    debounceMs ?? PERFORMANCE_CONFIG.PRICE_UPDATE_DEBOUNCE_MS;

  // Track if we've received the first update for each symbol
  // This only resets when symbols change, not debounce settings
  // This ensures existing prices remain visible when changing debounce
  const hasReceivedFirstUpdate = useRef<Set<string>>(new Set());

  const memoizedCallback = useCallback(
    (newPrices: PriceUpdate[]) => {
      // Check if any of these are first updates
      const hasFirstUpdate = newPrices.some(
        (price) => !hasReceivedFirstUpdate.current.has(price.coin),
      );

      // Store updates in pending map
      newPrices.forEach((price) => {
        pendingUpdatesRef.current.set(price.coin, price);
        hasReceivedFirstUpdate.current.add(price.coin);
      });

      // If this is the first update for any symbol, flush immediately
      if (hasFirstUpdate) {
        flushPendingUpdates();
        return;
      }

      // For subsequent updates, use debouncing
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
    // Reset first update tracking ONLY when symbols change (not debounce)
    // This ensures we get first update immediately for new symbols
    hasReceivedFirstUpdate.current.clear();
  }, [stableSymbols]);

  useEffect(() => {
    if (stableSymbols.length === 0 || !isInitialized) {
      return;
    }

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
    debounceDelay,
  ]);

  return prices;
}
