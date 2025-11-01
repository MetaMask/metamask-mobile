import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';

/**
 * Order book data from L2 order book
 */
export interface OrderBookData {
  bestBid?: string;
  bestAsk?: string;
  spread?: string;
}

export interface UsePerpsOrderBookOptions {
  /** Array of symbols to subscribe to L2 order book data */
  symbols: string[];
}

/**
 * Hook for L2 order book subscriptions (bid/ask prices)
 *
 * **Important**: Only use this hook when you need order book data for fee calculations
 * (maker/taker determination). Most views should use `usePerpsLivePrices` instead.
 *
 * Order book data is used to determine if a limit order will be maker or taker:
 * - Limit buy BELOW bestAsk = maker (provides liquidity, 0.015% fee)
 * - Limit buy AT/ABOVE bestAsk = taker (removes liquidity, 0.045% fee)
 *
 * Currently needed by:
 * - PerpsOrderView (for fee calculations when placing orders)
 * - PerpsClosePositionView (for fee calculations when closing positions)
 *
 * @param options - Configuration options for the hook
 * @returns Record of symbol to order book data with real-time L2 updates
 *
 * @example
 * ```typescript
 * // In OrderView - need both prices and order book
 * const prices = usePerpsLivePrices({ symbols: ['BTC'] });
 * const orderBooks = usePerpsOrderBook({ symbols: ['BTC'] });
 *
 * const currentPrice = prices['BTC'];
 * const orderBook = orderBooks['BTC'];
 *
 * // Use order book for maker/taker determination
 * const isMaker = limitPrice < Number(orderBook.bestAsk);
 * ```
 */
export function usePerpsOrderBook(
  options: UsePerpsOrderBookOptions,
): Record<string, OrderBookData> {
  const { symbols } = options;
  const stream = usePerpsStream();
  const [orderBooks, setOrderBooks] = useState<Record<string, OrderBookData>>(
    {},
  );

  useEffect(() => {
    if (symbols.length === 0) return;

    const unsubscribe = stream.orderBooks.subscribeToSymbols({
      symbols,
      callback: (newOrderBooks) => {
        if (!newOrderBooks) {
          return;
        }
        setOrderBooks(newOrderBooks);
      },
    });

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, symbols.join(',')]);

  return orderBooks;
}
