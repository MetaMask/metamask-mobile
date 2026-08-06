import {
  isTPSLOrder,
  type Order,
  type Position,
} from '@metamask/perps-controller';
import { getPositionDirection } from './positionCalculations';

/** Tolerance for token-size comparisons (covers floating-point / szDecimals noise). */
const SIZE_EPSILON = 1e-10;

export type ReduceOnlyValidationCode =
  | 'no_position'
  | 'wrong_side'
  | 'too_large';

export type ReduceOnlyOrderDirection = 'long' | 'short';

export interface ValidateReduceOnlyOrderParams {
  reduceOnly: boolean;
  /** Form direction: long = buy, short = sell. */
  direction: ReduceOnlyOrderDirection;
  /** Proposed order size in token units. */
  orderSize: string;
  /** Current position for the market, if any. */
  position: Position | null;
  /** Open orders from the live stream (unfiltered). */
  openOrders: Order[];
  /** Market symbol used to match position/orders. */
  symbol: string;
}

export interface ValidateReduceOnlyOrderResult {
  isValid: boolean;
  errorCode?: ReduceOnlyValidationCode;
  /**
   * True when the order consumes all remaining closable capacity.
   * Callers may pass `isFullClose` to the controller so dust closes skip the
   * minimum-notional gate.
   */
  isFullClose: boolean;
  /** Token units still available to close after reserving resting reduce-only. */
  remainingClosableSize: number;
}

/**
 * Sums remaining size of active, non-trigger reduce-only orders that close the
 * same side of the given position. TP/SL trigger orders are excluded because
 * they are conditional alternatives and must not double-count reserved capacity.
 */
export const getReservedReduceOnlySize = ({
  openOrders,
  symbol,
  positionDirection,
}: {
  openOrders: Order[];
  symbol: string;
  positionDirection: ReduceOnlyOrderDirection;
}): number => {
  // Closing a long requires sell; closing a short requires buy.
  const closingSide: Order['side'] =
    positionDirection === 'long' ? 'sell' : 'buy';

  return openOrders.reduce((sum, order) => {
    if (order.symbol !== symbol) {
      return sum;
    }
    if (order.status !== 'open') {
      return sum;
    }
    if (order.reduceOnly !== true) {
      return sum;
    }
    if (order.isTrigger === true || isTPSLOrder(order.detailedOrderType)) {
      return sum;
    }
    if (order.side !== closingSide) {
      return sum;
    }

    const remaining = Number.parseFloat(
      order.remainingSize || order.size || '0',
    );
    if (!Number.isFinite(remaining) || remaining <= 0) {
      return sum;
    }

    return sum + remaining;
  }, 0);
};

/**
 * Validates reduce-only order semantics against the live position and open
 * orders. Returns the first blocking error in priority order:
 * no-position → wrong-side → too-large.
 *
 * When `reduceOnly` is false, the result is always valid.
 */
export const validateReduceOnlyOrder = ({
  reduceOnly,
  direction,
  orderSize,
  position,
  openOrders,
  symbol,
}: ValidateReduceOnlyOrderParams): ValidateReduceOnlyOrderResult => {
  if (!reduceOnly) {
    return {
      isValid: true,
      isFullClose: false,
      remainingClosableSize: 0,
    };
  }

  const positionDirection = position
    ? getPositionDirection(position.size)
    : 'unknown';

  if (!position || positionDirection === 'unknown') {
    return {
      isValid: false,
      errorCode: 'no_position',
      isFullClose: false,
      remainingClosableSize: 0,
    };
  }

  if (direction === positionDirection) {
    return {
      isValid: false,
      errorCode: 'wrong_side',
      isFullClose: false,
      remainingClosableSize: 0,
    };
  }

  const absolutePositionSize = Math.abs(Number.parseFloat(position.size));
  const reservedSize = getReservedReduceOnlySize({
    openOrders,
    symbol,
    positionDirection,
  });
  const remainingClosableSize = Math.max(
    0,
    absolutePositionSize - reservedSize,
  );

  const parsedOrderSize = Number.parseFloat(orderSize);
  const orderSizeValue =
    Number.isFinite(parsedOrderSize) && parsedOrderSize > 0
      ? parsedOrderSize
      : 0;

  if (orderSizeValue > remainingClosableSize + SIZE_EPSILON) {
    return {
      isValid: false,
      errorCode: 'too_large',
      isFullClose: false,
      remainingClosableSize,
    };
  }

  const isFullClose =
    remainingClosableSize > 0 &&
    orderSizeValue + SIZE_EPSILON >= remainingClosableSize;

  return {
    isValid: true,
    isFullClose,
    remainingClosableSize,
  };
};
