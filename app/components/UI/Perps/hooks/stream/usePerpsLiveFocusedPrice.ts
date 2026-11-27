import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import {
  type PriceUpdate,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import { usePerpsMarketContext } from '../usePerpsMarketContext';

export interface UsePerpsLiveFocusedPriceOptions {
  /**
   * Symbol to subscribe to fast price updates for (e.g. 'BTC', 'ETH').
   * Only one symbol is active at a time — pass the focused asset for the
   * detail or ticket screen.
   */
  symbol: string;
  /**
   * Venue the focused price must come from (TAT-4407). Updates from other
   * venues are never delivered; without one the stream follows the
   * active/default venue.
   */
  providerId?: PerpsProviderType;
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
  const { symbol, enabled = true, providerId } = options;
  const stream = usePerpsStream();
  const { key: marketContextKey, isReady: isMarketContextReady } =
    usePerpsMarketContext();
  const identity = JSON.stringify([marketContextKey, providerId, symbol]);
  const [priceState, setPriceState] = useState<{
    identity: string;
    update: PriceUpdate;
  }>();
  useEffect(() => {
    if (!symbol || !enabled || !isMarketContextReady) {
      setPriceState(undefined);
      return;
    }
    setPriceState((prev) => (prev?.identity === identity ? prev : undefined));
    const unsubscribe = stream.focusedPrice.subscribeToSymbol({
      symbol,
      providerId,
      callback: (update) => {
        setPriceState(update ? { identity, update } : undefined);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [identity, stream, symbol, enabled, isMarketContextReady, providerId]);

  return enabled && isMarketContextReady && priceState?.identity === identity
    ? priceState.update
    : undefined;
}
