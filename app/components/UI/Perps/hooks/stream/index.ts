import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import { DevLogger } from '../../../../../core/SDKConnect/utils/DevLogger';
import type {
  Order,
  Position,
  OrderFill,
  PriceUpdate,
} from '../../controllers/types';

export interface UseLivePricesOptions {
  /** Array of symbols to subscribe to */
  symbols: string[];
  /** Debounce delay in milliseconds (default: 100ms) */
  debounceMs?: number;
}

/**
 * Hook for live price updates with component-specific debouncing
 * @param options - Configuration options for the hook
 * @returns Record of symbol to price data
 */
export function useLivePrices(
  options: UseLivePricesOptions,
): Record<string, PriceUpdate> {
  const { symbols, debounceMs = 100 } = options;
  const stream = usePerpsStream();
  const [prices, setPrices] = useState<Record<string, PriceUpdate>>({});

  useEffect(() => {
    if (symbols.length === 0) return;

    DevLogger.log(
      `useLivePrices: Subscribing to symbols with ${debounceMs}ms debounce`,
      { symbols },
    );

    const unsubscribe = stream.prices.subscribeToSymbols({
      symbols,
      callback: (newPrices) => {
        if (!newPrices) {
          return;
        }
        DevLogger.log(
          `useLivePrices: Received price update (${debounceMs}ms debounce)`,
          {
            symbols: Object.keys(newPrices),
            prices: Object.entries(newPrices).map(([coin, data]) => ({
              coin,
              price: data.price,
            })),
          },
        );
        setPrices(newPrices);
      },
      debounceMs,
    });

    return () => {
      DevLogger.log(
        `useLivePrices: Unsubscribing from symbols (${debounceMs}ms debounce)`,
        { symbols },
      );
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, symbols.join(','), debounceMs]);

  return prices;
}

export interface UseLiveOrdersOptions {
  /** Debounce delay in milliseconds (default: 500ms) */
  debounceMs?: number;
}

/**
 * Hook for live order updates with component-specific debouncing
 * @param options - Configuration options for the hook
 * @returns Array of orders
 */
export function useLiveOrders(options: UseLiveOrdersOptions = {}): Order[] {
  const { debounceMs = 500 } = options;
  const stream = usePerpsStream();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const unsubscribe = stream.orders.subscribe({
      callback: (newOrders) => {
        if (!newOrders) {
          return;
        }
        setOrders(newOrders);
      },
      debounceMs,
    });

    return unsubscribe;
  }, [stream, debounceMs]);

  return orders;
}

export interface UseLivePositionsOptions {
  /** Debounce delay in milliseconds (default: 1000ms) */
  debounceMs?: number;
}

/**
 * Hook for live position updates with component-specific debouncing
 * @param options - Configuration options for the hook
 * @returns Array of positions
 */
export function useLivePositions(
  options: UseLivePositionsOptions = {},
): Position[] {
  const { debounceMs = 1000 } = options;
  const stream = usePerpsStream();
  const [positions, setPositions] = useState<Position[]>([]);

  useEffect(() => {
    const unsubscribe = stream.positions.subscribe({
      callback: (newPositions) => {
        if (!newPositions) {
          return;
        }
        setPositions(newPositions);
      },
      debounceMs,
    });

    return unsubscribe;
  }, [stream, debounceMs]);

  return positions;
}

export interface UseLiveFillsOptions {
  /** Debounce delay in milliseconds (default: 0ms for immediate updates) */
  debounceMs?: number;
}

/**
 * Hook for live order fill updates with component-specific debouncing
 * @param options - Configuration options for the hook
 * @returns Array of order fills
 */
export function useLiveFills(options: UseLiveFillsOptions = {}): OrderFill[] {
  const { debounceMs = 0 } = options;
  const stream = usePerpsStream();
  const [fills, setFills] = useState<OrderFill[]>([]);

  useEffect(() => {
    const unsubscribe = stream.fills.subscribe({
      callback: (newFills) => {
        if (!newFills) {
          return;
        }
        setFills(newFills);
      },
      debounceMs,
    });

    return unsubscribe;
  }, [stream, debounceMs]);

  return fills;
}

// Export types for components to use
export type { PriceUpdate } from '../../controllers/types';

// Future hooks to be added:
// export function useLiveFunding(debounceMs: number = 5000): Funding[] { ... }
// export function useLiveAccountState(debounceMs: number = 2000): AccountState { ... }
// export function useLiveOrderBook(symbol: string, debounceMs: number = 100): OrderBook { ... }
// export function useLiveTrades(symbol: string, debounceMs: number = 0): Trade[] { ... }
