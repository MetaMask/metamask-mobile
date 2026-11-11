import type { Order } from '@metamask/perps-controller';

/**
 * Shared open/close + direction classification for perps order labels and
 * Activity kinds. No runtime imports.
 */

/**
 * Whether an order is restricted to reducing an existing position.
 *
 * Provider data with an explicit `reduceOnly` value is authoritative because
 * trigger orders can also open or increase a position. Some provider payloads
 * omit that value, so triggers retain the legacy closing classification only
 * when `reduceOnly` is absent.
 */
export const isClosingOrder = ({
  reduceOnly,
  isTrigger,
}: Partial<Pick<Order, 'reduceOnly' | 'isTrigger'>>): boolean => {
  if (typeof reduceOnly === 'boolean') {
    return reduceOnly;
  }

  return Boolean(isTrigger);
};

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
