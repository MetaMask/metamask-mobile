import { strings } from '../../../../../locales/i18n';
import { OrderParams, Order } from '../controllers/types';
import { Position } from '../hooks';

/**
 * Get the order direction based on the side and position size
 * @param side - The side of the order
 * @param positionSize - The size of the position
 * @returns The order direction
 */
export const getOrderDirection = (
  side: 'buy' | 'sell',
  positionSize: string | undefined,
): string => {
  const hasPosition = !!positionSize;

  // No existing position → direction depends only on side
  if (!hasPosition) {
    return side === 'buy'
      ? strings('perps.market.long')
      : strings('perps.market.short');
  }

  // Existing position → infer direction based on position size
  if (positionSize && parseFloat(positionSize) > 0) {
    return strings('perps.market.long');
  }

  return strings('perps.market.short');
};

export const willFlipPosition = (
  currentPosition: Position,
  orderParams: OrderParams,
): boolean => {
  const currentPositionSize = parseFloat(currentPosition.size);
  const positionDirection = currentPositionSize > 0 ? 'long' : 'short';
  const orderDirection = orderParams.isBuy ? 'long' : 'short';
  const orderSize = parseFloat(orderParams.size);

  if (orderParams.reduceOnly === true) {
    return false;
  }

  if (orderParams.orderType !== 'market') {
    return false;
  }

  if (positionDirection === orderDirection) {
    return false;
  }

  if (orderSize > Math.abs(currentPositionSize)) {
    return true;
  }

  return false;
};

/**
 * Format an order label following the pattern: [Type] [Close?] [Direction]
 *
 * Examples:
 * - Market Long
 * - Market Close Long
 * - Limit Short
 * - Limit Close Short
 * - Stop Market Close Long
 * - Take Profit Limit Close Short
 *
 * @param order - The order object
 * @returns Formatted order label string
 */
export const formatOrderLabel = (order: Order): string => {
  const { side, detailedOrderType, orderType, reduceOnly, isTrigger } = order;

  // Determine if this is a closing order
  const isClosing = Boolean(reduceOnly || isTrigger);

  // Determine direction based on whether it's closing or not
  let direction: string;
  if (isClosing) {
    // For closing orders: sell closes long, buy closes short
    direction = side === 'sell' ? 'Long' : 'Short';
  } else {
    // For opening orders: buy is long, sell is short
    direction = side === 'buy' ? 'Long' : 'Short';
  }

  // Get the order type string
  // Use detailedOrderType if available (e.g., "Stop Market", "Take Profit Limit")
  // Otherwise fall back to basic orderType
  const typeString =
    detailedOrderType || (orderType === 'limit' ? 'Limit' : 'Market');

  // Build the label: [Type] [Close?] [Direction]
  if (isClosing) {
    return `${typeString} Close ${direction}`;
  }

  return `${typeString} ${direction}`;
};

/**
 * Get just the direction portion of an order label
 * Used for compatibility with existing code that expects just "long" or "short"
 *
 * @param order - The order object
 * @returns Direction string ("long" or "short" for opening, "Close Long" or "Close Short" for closing)
 */
export const getOrderLabelDirection = (order: Order): string => {
  const { side, reduceOnly, isTrigger } = order;

  // Determine if this is a closing order
  const isClosing = Boolean(reduceOnly || isTrigger);

  if (isClosing) {
    // For closing orders: sell closes long, buy closes short
    return side === 'sell' ? 'Close Long' : 'Close Short';
  }

  // For opening orders: buy is long, sell is short
  return side === 'buy' ? 'long' : 'short';
};
