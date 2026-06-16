import { useEffect, useMemo, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { type PriceUpdate } from '@metamask/perps-controller';

export interface UsePerpsLivePricesOptions {
  /** Array of symbols to subscribe to */
  symbols: string[];
  /** Throttle delay in milliseconds (default: 1000ms to prevent excessive re-renders) */
  throttleMs?: number;
  /**
   * When true, opens a per-symbol activeAssetCtx WebSocket subscription for
   * sub-second price cadence and populates funding, openInterest, volume24h,
   * and markPrice on each PriceUpdate.
   *
   * Only use on focused/single-symbol views (detail, order ticket, position
   * detail). Do NOT set this on list or overview screens — it opens one
   * dedicated WS connection per symbol.
   *
   * Defaults to false.
   */
  includeMarketData?: boolean;
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
  const { symbols, throttleMs = 1000, includeMarketData = false } = options;
  const stream = usePerpsStream();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  // Memoize joined symbols to prevent unnecessary effect re-runs
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

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
      includeMarketData,
    });

    return () => {
      unsubscribe();
    };
    // symbolsKey captures symbols changes via memoization, so symbols is intentionally omitted
    // to prevent re-subscriptions when array reference changes but content is the same
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, symbolsKey, throttleMs, includeMarketData]);

  return prices;
}
