import { capitalize } from 'lodash';
import {
  type OrderParams,
  type Order,
  type PerpsDebugLogger,
} from '@metamask/perps-controller';
import BigNumber from 'bignumber.js';
import { Position } from '../hooks';

/**
 * Optional debug logger for order utility functions.
 * When provided, enables detailed logging for debugging.
 */
export type OrderUtilsDebugLogger = PerpsDebugLogger | undefined;

const FULL_POSITION_SIZE_TOLERANCE = new BigNumber('0.00000001');
const ORDER_PRICE_MATCH_TOLERANCE = new BigNumber('0.00000001');
const SYNTHETIC_TP_ID_SUFFIX = '-synthetic-tp';
const SYNTHETIC_SL_ID_SUFFIX = '-synthetic-sl';
const TRIGGER_CONDITION_PRICE_ABOVE = 'perps.order_details.price_above';
const TRIGGER_CONDITION_PRICE_BELOW = 'perps.order_details.price_below';

const getAbsoluteOrderSize = (order: Order): BigNumber | null => {
  const size = order.originalSize || order.size;
  const parsedSize = new BigNumber(size || '0');
  if (!parsedSize.isFinite() || parsedSize.lte(0)) {
    return null;
  }
  return parsedSize.abs();
};

const getAbsolutePositionSize = (position?: Position): BigNumber | null => {
  if (!position?.size) {
    return null;
  }

  const parsedSize = new BigNumber(position.size);
  if (!parsedSize.isFinite() || parsedSize.isZero()) {
    return null;
  }

  return parsedSize.abs();
};

const getOrderTriggerPrice = (order: Order): BigNumber | null => {
  const rawPrice = order.triggerPrice || order.price;
  if (!rawPrice) {
    return null;
  }

  const parsedPrice = new BigNumber(rawPrice);
  if (!parsedPrice.isFinite() || parsedPrice.lte(0)) {
    return null;
  }

  return parsedPrice;
};

const hasMatchingRealReduceOnlyTrigger = (
  orders: Order[],
  syntheticOrder: Order,
): boolean => {
  // TODO: Current matching is O(n) per synthetic row. If open-order volume grows
  // significantly, precompute a parent-scoped lookup map to avoid O(n^2).
  if (!syntheticOrder.parentOrderId) {
    return false;
  }

  const parentOrder = orders.find(
    (order) => order.orderId === syntheticOrder.parentOrderId,
  );

  return orders.some((order) => {
    if (order.isSynthetic) {
      return false;
    }

    const isSameParentByChildLink = Boolean(
      order.parentOrderId &&
        order.parentOrderId === syntheticOrder.parentOrderId,
    );
    const isSameParentByParentReference = Boolean(
      parentOrder &&
        (parentOrder.takeProfitOrderId === order.orderId ||
          parentOrder.stopLossOrderId === order.orderId),
    );

    if (!isSameParentByChildLink && !isSameParentByParentReference) {
      return false;
    }

    if (
      order.symbol !== syntheticOrder.symbol ||
      order.side !== syntheticOrder.side ||
      order.reduceOnly !== true ||
      order.isTrigger !== true
    ) {
      return false;
    }

    const existingOrderPrice = getOrderTriggerPrice(order);
    const syntheticOrderPrice = getOrderTriggerPrice(syntheticOrder);

    if (!existingOrderPrice || !syntheticOrderPrice) {
      return false;
    }

    return existingOrderPrice
      .minus(syntheticOrderPrice)
      .abs()
      .lte(ORDER_PRICE_MATCH_TOLERANCE);
  });
};

const isClosingSideForPosition = (
  order: Order,
  position: Position,
): boolean => {
  const positionSize = new BigNumber(position.size || '0');
  if (!positionSize.isFinite() || positionSize.isZero()) {
    return false;
  }

  // For long positions, sell closes. For short positions, buy closes.
  return positionSize.gt(0) ? order.side === 'sell' : order.side === 'buy';
};

export type TriggerConditionKey =
  | typeof TRIGGER_CONDITION_PRICE_ABOVE
  | typeof TRIGGER_CONDITION_PRICE_BELOW;

export const inferTriggerConditionKey = (params: {
  detailedOrderType?: string;
  side: 'buy' | 'sell';
  triggerPrice?: string;
  price?: string;
}): TriggerConditionKey | undefined => {
  const { detailedOrderType, side, triggerPrice, price } = params;

  const parsedTriggerPrice = Number.parseFloat(triggerPrice || '');
  if (!Number.isFinite(parsedTriggerPrice) || parsedTriggerPrice <= 0) {
    return undefined;
  }

  const normalizedDetailedOrderType = (detailedOrderType || '').toLowerCase();
  const isTakeProfit = normalizedDetailedOrderType.includes('take profit');
  const isStop = normalizedDetailedOrderType.includes('stop');

  if ((isTakeProfit && side === 'sell') || (isStop && side === 'buy')) {
    return TRIGGER_CONDITION_PRICE_ABOVE;
  }

  if ((isTakeProfit && side === 'buy') || (isStop && side === 'sell')) {
    return TRIGGER_CONDITION_PRICE_BELOW;
  }

  const parsedPrice = Number.parseFloat(price || '');
  const hasPrice = Number.isFinite(parsedPrice) && parsedPrice > 0;
  if (hasPrice && parsedTriggerPrice !== parsedPrice) {
    if (side === 'sell') {
      return parsedTriggerPrice > parsedPrice
        ? TRIGGER_CONDITION_PRICE_ABOVE
        : TRIGGER_CONDITION_PRICE_BELOW;
    }
    return parsedTriggerPrice < parsedPrice
      ? TRIGGER_CONDITION_PRICE_ABOVE
      : TRIGGER_CONDITION_PRICE_BELOW;
  }

  return side === 'sell'
    ? TRIGGER_CONDITION_PRICE_ABOVE
    : TRIGGER_CONDITION_PRICE_BELOW;
};

/**
 * Determines whether an order is associated with the full active position.
 *
 * Position association logic:
 * 1. Order must be reduce-only.
 * 2. Order and position must match symbol and closing side semantics.
 * 3. Prefer native isPositionTpsl flag when available.
 * 4. Fallback to full-size matching with decimal tolerance.
 */
export const isOrderAssociatedWithFullPosition = (
  order: Order,
  position?: Position,
): boolean => {
  if (!order.reduceOnly || !position) {
    return false;
  }

  if (
    order.symbol !== position.symbol ||
    !isClosingSideForPosition(order, position)
  ) {
    return false;
  }

  if (order.isPositionTpsl === true) {
    return true;
  }

  // Only fall back to size matching when the provider did not send the flag.
  if (order.isPositionTpsl === false) {
    return false;
  }

  const orderSize = getAbsoluteOrderSize(order);
  const positionSize = getAbsolutePositionSize(position);
  if (!orderSize || !positionSize) {
    return false;
  }

  return orderSize.minus(positionSize).abs().lte(FULL_POSITION_SIZE_TOLERANCE);
};

/**
 * Determines whether an order should be shown in Market Details > Orders.
 *
 * - All non-reduce-only orders are shown.
 * - Reduce-only orders are shown only when they are NOT full-position TP/SL.
 */
export const shouldDisplayOrderInMarketDetailsOrders = (
  order: Order,
  position?: Position,
): boolean => {
  if (!order.reduceOnly) {
    return true;
  }

  return !isOrderAssociatedWithFullPosition(order, position);
};

export const isSyntheticPlaceholderOrderId = (orderId: string): boolean =>
  orderId.endsWith(SYNTHETIC_TP_ID_SUFFIX) ||
  orderId.endsWith(SYNTHETIC_SL_ID_SUFFIX);

export const isSyntheticOrderCancelable = (order: Order): boolean => {
  if (!order.isSynthetic) {
    return true;
  }

  return !isSyntheticPlaceholderOrderId(order.orderId);
};

const buildSyntheticTriggerOrder = (
  parentOrder: Order,
  triggerType: 'tp' | 'sl',
): Order | null => {
  const triggerPrice =
    triggerType === 'tp'
      ? parentOrder.takeProfitPrice
      : parentOrder.stopLossPrice;
  const parsedTriggerPrice = new BigNumber(triggerPrice || '');
  if (!parsedTriggerPrice.isFinite() || parsedTriggerPrice.lte(0)) {
    return null;
  }
  const normalizedTriggerPrice = parsedTriggerPrice.toFixed();

  const syntheticSide = parentOrder.side === 'buy' ? 'sell' : 'buy';
  const isMarketParent =
    parentOrder.orderType === 'market' ||
    (parentOrder.detailedOrderType || '').toLowerCase().includes('market');
  const syntheticOrderType = isMarketParent ? 'market' : 'limit';
  const syntheticDetailedType =
    triggerType === 'tp'
      ? `Take Profit ${isMarketParent ? 'Market' : 'Limit'}`
      : `Stop ${isMarketParent ? 'Market' : 'Limit'}`;
  const size = parentOrder.originalSize || parentOrder.size || '0';
  const existingChildOrderId =
    triggerType === 'tp'
      ? parentOrder.takeProfitOrderId
      : parentOrder.stopLossOrderId;
  const syntheticOrderIdSuffix =
    triggerType === 'tp' ? SYNTHETIC_TP_ID_SUFFIX : SYNTHETIC_SL_ID_SUFFIX;
  const syntheticOrderId =
    existingChildOrderId && existingChildOrderId.trim().length > 0
      ? existingChildOrderId
      : `${parentOrder.orderId}${syntheticOrderIdSuffix}`;

  return {
    orderId: syntheticOrderId,
    parentOrderId: parentOrder.orderId,
    isSynthetic: true,
    symbol: parentOrder.symbol,
    side: syntheticSide,
    orderType: syntheticOrderType,
    size,
    originalSize: size,
    price: normalizedTriggerPrice,
    filledSize: '0',
    remainingSize: size,
    status: 'open',
    timestamp: parentOrder.timestamp,
    detailedOrderType: syntheticDetailedType,
    isTrigger: true,
    reduceOnly: true,
    triggerPrice: normalizedTriggerPrice,
    providerId: parentOrder.providerId,
  };
};

/**
 * Builds display orders with synthetic TP/SL rows for untriggered parent orders.
 *
 * Synthetic rows are display-only and are not created when a real reduce-only
 * trigger already exists with matching symbol, side, and trigger price.
 */
export const buildDisplayOrdersWithSyntheticTpsl = (
  orders: Order[],
): Order[] => {
  if (!orders.length) {
    return orders;
  }

  const displayOrders: Order[] = [];

  orders.forEach((order) => {
    displayOrders.push(order);

    if (order.isTrigger) {
      return;
    }

    const syntheticTpOrder = buildSyntheticTriggerOrder(order, 'tp');
    if (
      syntheticTpOrder &&
      !hasMatchingRealReduceOnlyTrigger(orders, syntheticTpOrder)
    ) {
      displayOrders.push(syntheticTpOrder);
    }

    const syntheticSlOrder = buildSyntheticTriggerOrder(order, 'sl');
    if (
      syntheticSlOrder &&
      !hasMatchingRealReduceOnlyTrigger(orders, syntheticSlOrder)
    ) {
      displayOrders.push(syntheticSlOrder);
    }
  });

  return displayOrders;
};

/**
 * Get the order direction based on the side and position size
 * @param side - The side of the order
 * @param positionSize - The size of the position
 * @returns The order direction ('long' or 'short') - raw string, translate in UI layer
 */
export const getOrderDirection = (
  side: 'buy' | 'sell',
  positionSize: string | undefined,
): 'long' | 'short' => {
  const hasPosition = !!positionSize;

  // No existing position → direction depends only on side
  if (!hasPosition) {
    return side === 'buy' ? 'long' : 'short';
  }

  // Existing position → infer direction based on position size
  if (positionSize && parseFloat(positionSize) > 0) {
    return 'long';
  }

  return 'short';
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
    direction = side === 'sell' ? 'long' : 'short';
  } else {
    // For opening orders: buy is long, sell is short
    direction = side === 'buy' ? 'long' : 'short';
  }

  // Get the order type string
  // Use detailedOrderType if available (e.g., "Stop Market", "Take Profit Limit")
  // Otherwise fall back to basic orderType
  const typeString =
    detailedOrderType || (orderType === 'limit' ? 'Limit' : 'Market');

  // Build the label: [Type] [Close?] [Direction]
  if (isClosing) {
    return capitalize(`${typeString} close ${direction}`);
  }

  return capitalize(`${typeString} ${direction}`);
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

/**
 * Determines if a limit order will likely be a maker or taker.
 *
 * Logic:
 * 1. Validates price data freshness and market state
 * 2. Market orders are always taker
 * 3. Limit orders that would execute immediately are taker
 * 4. Limit orders that go into order book are maker
 *
 * @param params - Order parameters
 * @param params.orderType - The order type (market or limit)
 * @param params.limitPrice - The limit price for limit orders
 * @param params.direction - The order direction (long or short)
 * @param params.bestAsk - The best ask price from order book
 * @param params.bestBid - The best bid price from order book
 * @param params.symbol - The trading symbol for logging
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns True if maker order, false if taker order
 */
export function determineMakerStatus(
  params: {
    orderType: 'market' | 'limit';
    limitPrice?: string;
    direction: 'long' | 'short';
    bestAsk?: number;
    bestBid?: number;
    symbol?: string;
  },
  debugLogger?: OrderUtilsDebugLogger,
): boolean {
  const { orderType, limitPrice, direction, bestAsk, bestBid, symbol } = params;
  // Market orders are always taker
  if (orderType === 'market') {
    return false;
  }

  // Default to taker when limit price is not specified
  if (!limitPrice || limitPrice === '') {
    return false;
  }

  const limitPriceNum = Number.parseFloat(limitPrice);

  if (Number.isNaN(limitPriceNum) || limitPriceNum <= 0) {
    return false;
  }

  if (bestBid !== undefined && bestAsk !== undefined) {
    if (direction === 'long') {
      return limitPriceNum < bestAsk;
    }

    // Short direction
    return limitPriceNum > bestBid;
  }

  // Default to taker when no bid/ask data is available
  debugLogger?.log(
    'Fee Calculation: No bid/ask data available, using conservative taker fee',
    { symbol },
  );
  return false;
}
