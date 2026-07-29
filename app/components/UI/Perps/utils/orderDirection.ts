import type { Order } from '@metamask/perps-controller';

/**
 * Shared open/close + direction classification for perps orders, so the UI's
 * `formatOrderLabel` and the Activity adapter's `mapOrderKind` never disagree.
 * No runtime imports.
 */

/** Reduce-only and trigger (TP/SL) orders both close a position. */
export const isClosingOrder = ({
  reduceOnly,
  isTrigger,
}: Partial<Pick<Order, 'reduceOnly' | 'isTrigger'>>): boolean =>
  Boolean(reduceOnly || isTrigger);

/**
 * Position direction implied by an order's side: a closing sell exits a long
 * (a closing buy exits a short); an opening buy enters a long.
 */
export const resolveOrderDirection = (
  side: Order['side'],
  isClosing: boolean,
): 'long' | 'short' => {
  if (isClosing) {
    return side === 'sell' ? 'long' : 'short';
  }
  return side === 'buy' ? 'long' : 'short';
};
