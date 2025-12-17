import { strings } from '../../../../../locales/i18n';
import { OrderParams, Order } from '../controllers/types';
import { Position } from '../hooks';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { capitalize } from 'lodash';

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
 * Determines if a limit order will likely be a maker or taker
 *
 * Logic:
 * 1. Validates price data freshness and market state
 * 2. Market orders are always taker
 * 3. Limit orders that would execute immediately are taker
 * 4. Limit orders that go into order book are maker
 *
 * @param params Order parameters
 * @returns boolean - true if maker, false if taker
 */
export function determineMakerStatus(params: {
  orderType: 'market' | 'limit';
  limitPrice?: string;
  direction: 'long' | 'short';
  bestAsk?: number;
  bestBid?: number;
  coin?: string;
}): boolean {
  const { orderType, limitPrice, direction, bestAsk, bestBid, coin } = params;
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
  DevLogger.log(
    'Fee Calculation: No bid/ask data available, using conservative taker fee',
    { coin },
  );
  return false;
}

// =============================================
// TP/SL Detection Utilities
// =============================================

/**
 * Check if an order type is a Take Profit order
 * @param orderType - The order type string (e.g., 'Take Profit Market', 'Take Profit Limit')
 * @returns true if the order is a Take Profit order
 */
export const isTakeProfitOrderType = (orderType?: string): boolean =>
  orderType?.includes('Take Profit') ?? false;

/**
 * Check if an order type is a Stop Loss order
 * @param orderType - The order type string (e.g., 'Stop Market', 'Stop Limit')
 * @returns true if the order is a Stop Loss order
 */
export const isStopLossOrderType = (orderType?: string): boolean =>
  orderType?.includes('Stop') ?? false;

/**
 * Determine TP/SL type from trigger price when order type is ambiguous
 * Uses the relationship between trigger price and entry price to infer intent
 *
 * @param triggerPrice - The trigger price of the order
 * @param entryPrice - The entry price of the position
 * @param isLong - Whether the position is long
 * @returns 'takeProfit' or 'stopLoss'
 */
export const determineTpSlFromPrice = (
  triggerPrice: number,
  entryPrice: number,
  isLong: boolean,
): 'takeProfit' | 'stopLoss' => {
  if (isLong) {
    // For long positions:
    // - TP triggers when price goes UP (triggerPrice > entryPrice)
    // - SL triggers when price goes DOWN (triggerPrice < entryPrice)
    return triggerPrice > entryPrice ? 'takeProfit' : 'stopLoss';
  }
  // For short positions:
  // - TP triggers when price goes DOWN (triggerPrice < entryPrice)
  // - SL triggers when price goes UP (triggerPrice > entryPrice)
  return triggerPrice < entryPrice ? 'takeProfit' : 'stopLoss';
};

/**
 * Parameters for extracting TP/SL type from an order
 */
export interface TpSlExtractionParams {
  orderType?: string;
  triggerPx?: string;
}

/**
 * Position data needed for TP/SL fallback detection
 */
export interface TpSlPositionData {
  size: string;
  entryPrice?: string;
}

/**
 * Extract TP/SL type from an order based on order type or trigger price
 *
 * Priority:
 * 1. Check if orderType explicitly indicates Take Profit
 * 2. Check if orderType explicitly indicates Stop Loss
 * 3. Fallback: determine based on trigger price vs entry price relationship
 *
 * @param order - The order with orderType and triggerPx
 * @param position - Optional position for fallback detection
 * @returns 'takeProfit', 'stopLoss', or null if not a TP/SL order
 */
export const extractTpSlTypeFromOrder = (
  order: TpSlExtractionParams,
  position?: TpSlPositionData,
): 'takeProfit' | 'stopLoss' | null => {
  if (!order.triggerPx) return null;

  if (isTakeProfitOrderType(order.orderType)) {
    return 'takeProfit';
  }

  if (isStopLossOrderType(order.orderType)) {
    return 'stopLoss';
  }

  // Fallback: determine based on trigger price vs entry price
  if (position?.entryPrice) {
    const triggerPrice = parseFloat(order.triggerPx);
    const entryPrice = parseFloat(position.entryPrice);
    const isLong = parseFloat(position.size) > 0;
    return determineTpSlFromPrice(triggerPrice, entryPrice, isLong);
  }

  return null;
};
