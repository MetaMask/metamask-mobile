import { Order, OrderFill } from '../controllers/types';

/**
 * Interface for trigger detection result
 */
export interface TriggerDetectionResult {
  isTakeProfit: boolean;
  isStopLoss: boolean;
  isTrigger: boolean;
}

/**
 * Detailed order types from HyperLiquid API
 */
export const DETAILED_ORDER_TYPES = {
  LIMIT: 'Limit',
  MARKET: 'Market',
  STOP_LIMIT: 'Stop Limit',
  STOP_MARKET: 'Stop Market',
  TAKE_PROFIT_LIMIT: 'Take Profit Limit',
  TAKE_PROFIT_MARKET: 'Take Profit Market',
} as const;

/**
 * Check if an order type is a TP/SL trigger order
 */
export const isTPSLOrder = (detailedOrderType?: string): boolean => {
  if (!detailedOrderType) return false;
  return (
    detailedOrderType === DETAILED_ORDER_TYPES.STOP_LIMIT ||
    detailedOrderType === DETAILED_ORDER_TYPES.STOP_MARKET ||
    detailedOrderType === DETAILED_ORDER_TYPES.TAKE_PROFIT_LIMIT ||
    detailedOrderType === DETAILED_ORDER_TYPES.TAKE_PROFIT_MARKET
  );
};

/**
 * Check if an order type is Take Profit
 */
export const isTakeProfitOrder = (detailedOrderType?: string): boolean => {
  if (!detailedOrderType) return false;
  return (
    detailedOrderType === DETAILED_ORDER_TYPES.TAKE_PROFIT_LIMIT ||
    detailedOrderType === DETAILED_ORDER_TYPES.TAKE_PROFIT_MARKET
  );
};

/**
 * Check if an order type is Stop Loss
 */
export const isStopLossOrder = (detailedOrderType?: string): boolean => {
  if (!detailedOrderType) return false;
  return (
    detailedOrderType === DETAILED_ORDER_TYPES.STOP_LIMIT ||
    detailedOrderType === DETAILED_ORDER_TYPES.STOP_MARKET
  );
};

/**
 * Detect trigger type from a fill and its matching order
 * This implements the pattern described by ChatGPT:
 * 1. Join fill.oid with historicalOrders based on order.orderId
 * 2. Check isTrigger, detailedOrderType from the order
 * 3. Determine TP vs SL from position side and trigger price relative to entry
 *
 * @param fill - The fill data from userFills API
 * @param matchingOrder - The matching order from historicalOrders API (optional)
 * @returns TriggerDetectionResult with trigger type information
 */
export const detectTriggerFromOrder = (
  fill: OrderFill,
  matchingOrder?: Order,
): TriggerDetectionResult => {
  const result: TriggerDetectionResult = {
    isTakeProfit: false,
    isStopLoss: false,
    isTrigger: false,
  };

  // If no matching order, can't determine trigger status
  if (!matchingOrder) {
    return result;
  }

  // Check if this is a trigger order based on detailed order type
  if (isTPSLOrder(matchingOrder.detailedOrderType)) {
    result.isTrigger = true;
    result.isTakeProfit = isTakeProfitOrder(matchingOrder.detailedOrderType);
    result.isStopLoss = isStopLossOrder(matchingOrder.detailedOrderType);
  }
  // Also check the isTrigger flag if available (additional safety check)
  else if (matchingOrder.isTrigger) {
    result.isTrigger = true;
    // For generic trigger orders without detailed type, we can't distinguish TP vs SL
    // This would require additional position data to make the distinction
    // For now, we'll mark as unknown trigger type
  }

  return result;
};

/**
 * Create a map of orderId to Order for efficient lookup
 * This helps with O(1) performance when joining fills with orders
 *
 * @param orders - Array of Order objects from historicalOrders API
 * @returns Map with orderId as key and Order as value
 */
export const createOrderLookupMap = (orders: Order[]): Map<string, Order> => {
  const orderMap = new Map<string, Order>();
  orders.forEach((order) => {
    if (order.orderId) {
      orderMap.set(order.orderId, order);
    }
  });
  return orderMap;
};

/**
 * Enhance fills with trigger detection information by joining with orders
 * This is the main utility function that implements the complete ChatGPT pattern
 *
 * @param fills - Array of OrderFill from userFills API
 * @param orders - Array of Order from historicalOrders API
 * @returns Array of enhanced OrderFill objects with trigger information
 */
export const enrichFillsWithTriggerInfo = (
  fills: OrderFill[],
  orders: Order[],
): OrderFill[] => {
  const orderMap = createOrderLookupMap(orders);

  return fills.map((fill) => {
    const matchingOrder = orderMap.get(fill.orderId);
    const triggerInfo = detectTriggerFromOrder(fill, matchingOrder);

    // Return enhanced fill with trigger information
    return {
      ...fill,
      isTakeProfit: triggerInfo.isTakeProfit,
      isStopLoss: triggerInfo.isStopLoss,
      detailedOrderType: matchingOrder?.detailedOrderType,
    };
  });
};
