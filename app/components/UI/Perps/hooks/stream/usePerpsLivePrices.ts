import { useEffect, useMemo, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import type {
  PerpsProviderType,
  PriceUpdate,
} from '@metamask/perps-controller';

const EMPTY_PRICES: Record<string, PriceUpdate> = {};

export interface UsePerpsLivePricesOptions {
  /** Array of symbols to subscribe to */
  symbols: string[];
  /** Restrict updates to this execution venue when provided. */
  providerId?: PerpsProviderType;
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
  const { symbols, providerId, throttleMs = 1000 } = options;
  const stream = usePerpsStream();
  const symbolsKey = JSON.stringify(symbols);
  const route = useMemo(
    () => ({ symbols: JSON.parse(symbolsKey) as string[], providerId, stream }),
    [symbolsKey, providerId, stream],
  );
  const [snapshot, setSnapshot] = useState<{
    route: typeof route;
    prices: Record<string, PriceUpdate>;
  }>();

  useEffect(() => {
    if (route.symbols.length === 0) return;

    let active = true;
    const unsubscribe = route.stream.prices.subscribeToSymbols({
      symbols: route.symbols,
      providerId: route.providerId,
      callback: (prices) => {
        if (active) setSnapshot({ route, prices: prices ?? EMPTY_PRICES });
      },
      throttleMs,
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [route, throttleMs]);

  return snapshot?.route === route ? snapshot.prices : EMPTY_PRICES;
}
