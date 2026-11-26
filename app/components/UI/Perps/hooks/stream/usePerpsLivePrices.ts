import { useEffect, useMemo, useState } from 'react';
import { parseVenueSymbolKey } from '../../providers/venueKeys';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import {
  type PriceUpdate,
  type PerpsProviderType,
} from '@metamask/perps-controller';

const EMPTY_PRICES: Record<string, PriceUpdate> = {};

export interface UsePerpsLivePricesOptions {
  /** Array of symbols to subscribe to */
  symbols: string[];
  providerId?: PerpsProviderType;
  /** Throttle delay in milliseconds (default: 1000ms to prevent excessive re-renders) */
  throttleMs?: number;
}

/**
 * Merges one venue's price batch into the per-key price map. `keys` maps the
 * venue's bare symbols to the keys the caller asked for. An empty batch means
 * the venue's prices were cleared, so its keys are removed.
 */
const applyVenuePriceUpdates = (
  prices: Record<string, PriceUpdate>,
  updates: Record<string, PriceUpdate>,
  keys: Map<string, string>,
): Record<string, PriceUpdate> => {
  const next = { ...prices };
  if (Object.keys(updates).length === 0) {
    for (const key of keys.values()) {
      delete next[key];
    }
    return next;
  }
  for (const [symbol, update] of Object.entries(updates)) {
    const key = keys.get(symbol);
    if (key) {
      next[key] = update;
    }
  }
  return next;
};

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
  }>({ identity, prices: EMPTY_PRICES });
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
    let active = true;
    const unsubscribes: (() => void)[] = [];
    groups.forEach((keys, venue) => {
      unsubscribes.push(
        stream.prices.subscribeToSymbols({
          symbols: Array.from(keys.keys()),
          providerId: venue,
          throttleMs,
          callback: (updates) => {
            if (!active || !updates) return;
            setSnapshot((prev) => ({
              identity,
              prices: applyVenuePriceUpdates(
                prev.identity === identity ? prev.prices : EMPTY_PRICES,
                updates,
                keys,
              ),
            }));
          },
        }),
      );
    });
    return () => {
      active = false;
      unsubscribes.forEach((unsubscribe) => unsubscribe());
    };
    // identity captures the symbol values, not the caller's array reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity, stream, throttleMs]);
  return snapshot.identity === identity ? snapshot.prices : EMPTY_PRICES;
}
