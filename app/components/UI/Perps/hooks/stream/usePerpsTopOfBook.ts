import { useEffect, useState } from 'react';
import { usePerpsStream } from '../../providers/PerpsStreamManager';

/**
 * Top of book data (best bid/ask only)
 */
export interface TopOfBookData {
  bestBid?: string;
  bestAsk?: string;
  spread?: string;
}

export interface UsePerpsTopOfBookOptions {
  /** Symbol to subscribe to top of book data */
  symbol: string;
}

/**
 * Hook for top of book subscriptions (best bid/ask prices only)
 *
 * **Important**: Only use this hook when you need top of book data for fee calculations
 * (maker/taker determination). Most views should use `usePerpsLivePrices` instead.
 *
 * Top of book data is used to determine if a limit order will be maker or taker:
 * - Limit buy BELOW bestAsk = maker (provides liquidity, 0.015% fee)
 * - Limit buy AT/ABOVE bestAsk = taker (removes liquidity, 0.045% fee)
 *
 * Currently needed by:
 * - PerpsOrderView (for fee calculations when placing orders)
 * - PerpsClosePositionView (for fee calculations when closing positions)
 *
 * @param options - Configuration options for the hook
 * @returns Top of book data for the specified symbol with real-time updates
 *
 * @example
 * ```typescript
 * // In OrderView - need both prices and top of book
 * const prices = usePerpsLivePrices({ symbols: ['BTC'] });
 * const topOfBook = usePerpsTopOfBook({ symbol: 'BTC' });
 *
 * const currentPrice = prices['BTC'];
 *
 * // Use top of book for maker/taker determination
 * const isMaker = topOfBook?.bestAsk && limitPrice < Number(topOfBook.bestAsk);
 * ```
 */
export function usePerpsTopOfBook(
  options: UsePerpsTopOfBookOptions,
): TopOfBookData | undefined {
  const { symbol } = options;
  const stream = usePerpsStream();
  const [topOfBook, setTopOfBook] = useState<TopOfBookData | undefined>(
    undefined,
  );

  useEffect(() => {
    if (!symbol) return;

    const unsubscribe = stream.topOfBook.subscribeToSymbol({
      symbol,
      callback: (newTopOfBook) => {
        setTopOfBook(newTopOfBook);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [stream, symbol]);

  return topOfBook;
}
