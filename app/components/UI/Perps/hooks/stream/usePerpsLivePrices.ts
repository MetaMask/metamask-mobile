import { useEffect, useMemo, useState } from 'react';
import { parseVenueSymbolKey } from '../../providers/venueKeys';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import {
  type PriceUpdate,
  type PerpsProviderType,
} from '@metamask/perps-controller';

export interface UsePerpsLivePricesOptions {
  /** Array of symbols to subscribe to */
  symbols: string[];
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
  const { symbols, providerId, throttleMs = 1000 } = options; // 1 second default for balanced performance
  const stream = usePerpsStream();
  // Mixed-venue lists pass composite keys; a single-venue caller can pass
  // bare symbols and providerId and keep looking up prices by symbol.
  const identity = useMemo(
    () => JSON.stringify([symbols, providerId]),
    [symbols, providerId],
  );
  const [snapshot, setSnapshot] = useState<{
    identity: string;
    prices: Record<string, PriceUpdate>;
  }>({ identity, prices: {} });
  useEffect(() => {
    const groups = new Map<
      PerpsProviderType | undefined,
      Map<string, string>
    >();
    symbols.forEach((key) => {
      const parsed = parseVenueSymbolKey(key);
      const venue = parsed.providerId ?? providerId;
      const group = groups.get(venue) ?? new Map<string, string>();
      group.set(parsed.symbol, key);
      groups.set(venue, group);
    });
    const unsubscribes = Array.from(groups, ([venue, keys]) =>
      stream.prices.subscribeToSymbols({
        symbols: Array.from(keys.keys()),
        providerId: venue,
        throttleMs,
        callback: (updates) => {
          if (!updates) return;
          setSnapshot((prev) => {
            const prices = prev.identity === identity ? { ...prev.prices } : {};
            if (Object.keys(updates).length === 0) {
              keys.forEach((key) => delete prices[key]);
            } else {
              Object.entries(updates).forEach(([symbol, update]) => {
                const key = keys.get(symbol);
                if (key) prices[key] = update;
              });
            }
            return { identity, prices };
          });
        },
      }),
    );
    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
    // identity captures the symbol values, not the caller's array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, stream, throttleMs]);
  return snapshot.identity === identity ? snapshot.prices : {};
}
