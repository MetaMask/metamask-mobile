import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type { PriceUpdate } from '../../controllers/types';

export interface UsePerpsLivePricesOptions {
  /** Array of symbols to subscribe to */
  symbols: string[];
  /** Throttle delay in milliseconds (default: 1000ms to prevent excessive re-renders) */
  throttleMs?: number;
}

/**
 * Hook for real-time price updates via WebSocket subscription
 * Supports component-specific throttling for performance optimization
 *
 * Prices update every second by default to balance between real-time feel
 * and performance. Components can override this based on their needs:
 * - Charts might want slower updates (2000ms)
 * - Price displays might want faster updates (500ms)
 *
 * @param options - Configuration options for the hook
 * @returns Record of symbol to price data with real-time updates
 */
export function usePerpsLivePrices(
  options: UsePerpsLivePricesOptions,
): Record<string, PriceUpdate> {
  const { symbols, throttleMs = 1000 } = options; // 1 second default for balanced performance
  const stream = usePerpsStream();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    const unsubscribe = stream.prices.subscribeToSymbols({
      symbols,
      callback: (newPrices) => {
        if (!newPrices) {
          return;
        }
        setPrices(newPrices);
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, symbols.join(','), throttleMs]);

  return prices;
}
