import type { PerpsProviderType } from '@metamask/perps-controller';
import { useEffect, useMemo, useState } from 'react';
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
  /** Restrict the quote to this execution venue when provided. */
  providerId?: PerpsProviderType;
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
  const { symbol, providerId } = options;
  const stream = usePerpsStream();
  const route = useMemo(
    () => ({ symbol, providerId, stream }),
    [symbol, providerId, stream],
  );
  const [snapshot, setSnapshot] = useState<{
    route: typeof route;
    topOfBook: TopOfBookData | undefined;
  }>();

  useEffect(() => {
    if (!route.symbol) return;

    let active = true;
    const unsubscribe = route.stream.topOfBook.subscribeToSymbol({
      symbol: route.symbol,
      providerId: route.providerId,
      callback: (topOfBook) => {
        if (active) setSnapshot({ route, topOfBook });
      },
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [route]);

  return snapshot?.route === route ? snapshot.topOfBook : undefined;
}
