import { useEffect, useRef, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { type PriceUpdate } from '@metamask/perps-controller';

export interface UsePerpsLiveFocusedPriceOptions {
  /**
   * Symbol to subscribe to fast price updates for (e.g. 'BTC', 'ETH').
   * Only one symbol is active at a time — pass the focused asset for the
   * detail or ticket screen.
   */
  symbol: string;
  /**
   * Whether to activate the subscription (default: true).
   * Set to false when the screen is inactive to avoid unnecessary connections.
   */
  enabled?: boolean;
}

/**
 * Hook for fast single-symbol price updates via the activeAssetCtx stream.
 *
 * Uses `includeMarketData: true` under the hood so the controller projects the
 * activeAssetCtx midPx/markPx onto updates for this subscriber (TAT-3334).
 * At ~0.5 s cadence when the user is focused on a detail/ticket screen, versus
 * the ~2 s allMids baseline that list/overview screens receive.
 *
 * **Important**: Only use this on focused single-asset screens (detail, ticket,
 * order book). Never subscribe to multiple symbols simultaneously with this hook
 * — each active subscription opens a reference-counted activeAssetCtx WebSocket.
 * For multi-symbol list screens use `usePerpsLivePrices` instead.
 *
 * Falls back gracefully: if no fast update has arrived yet the return value is
 * `undefined`, so callers should also read from the central price cache as a
 * first-render fallback.
 *
 * @param options - Symbol, and optional enabled flag.
 * @returns The latest PriceUpdate for the symbol, or undefined before first tick.
 *
 * @example
 * ```typescript
 * const focusedPrice = usePerpsLiveFocusedPrice({ symbol: 'BTC' });
 * const centralPrices = usePerpsLivePrices({ symbols: ['BTC'] });
 *
 * const currentPrice =
 *   focusedPrice?.markPrice ??
 *   focusedPrice?.price ??
 *   centralPrices['BTC']?.price;
 * ```
 */
export function usePerpsLiveFocusedPrice(
  options: UsePerpsLiveFocusedPriceOptions,
): PriceUpdate | undefined {
  const { symbol, enabled = true } = options;
  const stream = usePerpsStream();
  const [priceUpdate, setPriceUpdate] = useState<PriceUpdate | undefined>(
    undefined,
  );

  // Track the symbol that produced the current cached value so we can clear
  // stale data only when the symbol changes, not on every effect re-run
  // (stream is a singleton in production but tests may return a new object
  // reference each render, which would otherwise trigger spurious resets).
  const activeSymbolRef = useRef<string | null>(null);

  useEffect(() => {
    if (!symbol || !enabled) {
      activeSymbolRef.current = null;
      setPriceUpdate(undefined);
      return;
    }

    // Clear stale data only when switching to a different symbol
    if (
      activeSymbolRef.current !== null &&
      activeSymbolRef.current !== symbol
    ) {
      setPriceUpdate(undefined);
    }
    activeSymbolRef.current = symbol;

    const unsubscribe = stream.focusedPrice.subscribeToSymbol({
      symbol,
      callback: (update) => {
        setPriceUpdate(update);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [stream, symbol, enabled]);

  return priceUpdate;
}
