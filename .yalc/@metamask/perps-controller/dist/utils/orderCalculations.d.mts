import type { SDKOrderParams } from "../types/hyperliquid-types.mjs";
import type { PerpsDebugLogger } from "../types/index.mjs";
import type { OrdinaryOrderType } from "../types/perps-types.mjs";
/**
 * Optional debug logger for order calculation functions.
 * When provided, enables detailed logging for debugging.
 */
export type OrderCalculationsDebugLogger = PerpsDebugLogger | undefined;
type PositionSizeParams = {
    amount: string;
    price: number;
    szDecimals: number;
};
type MarginRequiredParams = {
    amount: string;
    leverage: number;
};
type MaxAllowedAmountParams = {
    spendableBalance: number;
    assetPrice: number;
    assetSzDecimals: number;
    leverage: number;
    orderType?: 'market' | 'limit';
    limitPrice?: number;
};
export type CalculateFinalPositionSizeParams = {
    usdAmount?: string;
    size?: string;
    currentPrice: number;
    priceAtCalculation?: number;
    maxSlippageBps?: number;
    szDecimals: number;
    leverage?: number;
    reduceOnly?: boolean;
    debugLogger?: OrderCalculationsDebugLogger;
};
export type CalculateFinalPositionSizeResult = {
    finalPositionSize: number;
};
export type CalculateOrderPriceAndSizeParams = {
    orderType: OrdinaryOrderType;
    isBuy: boolean;
    finalPositionSize: number;
    currentPrice: number;
    limitPrice?: string;
    triggerPrice?: string;
    maxSlippageBps?: number;
    szDecimals: number;
};
export type CalculateOrderPriceAndSizeResult = {
    orderPrice: number;
    formattedSize: string;
    formattedPrice: string;
};
export type BuildOrdersArrayParams = {
    assetId: number;
    isBuy: boolean;
    formattedPrice: string;
    formattedSize: string;
    reduceOnly: boolean;
    orderType: OrdinaryOrderType;
    timeInForce?: 'GTC' | 'IOC' | 'ALO';
    clientOrderId?: string;
    triggerPrice?: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    takeProfitSize?: string;
    stopLossSize?: string;
    szDecimals: number;
    grouping?: 'na' | 'normalTpsl' | 'positionTpsl';
};
export type BuildOrdersArrayResult = {
    orders: SDKOrderParams[];
    grouping: 'na' | 'normalTpsl' | 'positionTpsl';
};
/**
 * Calculate position size based on USD amount and asset price
 *
 * @param params - Amount in USD, current asset price, and required decimal precision
 * @returns Position size formatted to the asset's decimal precision
 */
export declare function calculatePositionSize(params: PositionSizeParams): string;
/**
 * Calculate margin required for a position
 *
 * @param params - Position amount and leverage
 * @returns Margin required formatted to 2 decimal places
 */
export declare function calculateMarginRequired(params: MarginRequiredParams): string;
export declare function getMaxAllowedAmount(params: MaxAllowedAmountParams): number;
/**
 * Round a size down onto the asset's size grid.
 *
 * Used for reduce-only orders, where rounding up would push the size past the
 * live position size. Values already on the grid are snapped rather than
 * truncated, because floating-point math can leave them just below a grid
 * point (0.0123 * 10000 === 122.99999999999999) and truncating would drop a
 * whole increment.
 *
 * The result is never greater than `size`, for negative sizes as well as
 * positive: the snap only ever recovers a grid point the input already
 * represents, so a value genuinely below a grid point is stepped down even when
 * the tolerance would have reached the point above it.
 *
 * A size whose scaled form reaches `2^53` is returned unchanged: doubles cannot
 * represent consecutive integers there, so the grid is finer than the spacing
 * between representable values and there is nothing to round down to.
 *
 * @param size - Size to round down.
 * @param szDecimals - The asset's size decimal precision.
 * @returns The size rounded down onto the size grid, never exceeding `size`.
 */
export declare function floorToSizeDecimals(size: number, szDecimals: number): number;
/**
 * The smallest price increment the venue will represent at a given price.
 *
 * HyperLiquid bounds a perp price two ways at once — a decimal-place cap that
 * depends on the asset's size precision, and a significant-figure cap — so the
 * tick widens as the price grows. Whichever bound is coarser at this price is
 * the tick.
 *
 * @param params - Tick parameters.
 * @param params.price - Price to measure the increment at.
 * @param params.szDecimals - The asset's size decimal precision.
 * @returns The tick size at that price.
 */
export declare function getPriceTick(params: {
    price: number;
    szDecimals: number;
}): number;
/**
 * Price a chase order against the book it is chasing.
 *
 * The venue's own definition: a chase rests one tick *inside* the spread —
 * above the best bid for a buy, below the best ask for a sell — except when the
 * spread is already a single tick, where there is no room to improve and the
 * order joins the touch instead.
 *
 * Rests inside rather than at the touch because a chase is post-only: sitting
 * one tick ahead of the rest of the queue is the whole point, and joining the
 * touch would leave it behind every order already resting there.
 *
 * @param params - Quote parameters.
 * @param params.bestBid - Best bid, excluding the chase's own resting order.
 * @param params.bestAsk - Best ask, excluding the chase's own resting order.
 * @param params.isBuy - Which side the chase rests on.
 * @param params.szDecimals - The asset's size decimal precision.
 * @returns The formatted price the chase should rest at.
 */
export declare function computeChaseQuotePrice(params: {
    bestBid: number;
    bestAsk: number;
    isBuy: boolean;
    szDecimals: number;
}): string;
/**
 * Compute the price ladder a scale placement fans out over.
 *
 * The ladder is inclusive of both ends — the first rung sits exactly on
 * `minPrice`, the last exactly on `maxPrice` — so the range the caller asked
 * for is the range that actually reaches the exchange.
 *
 * @param params - Ladder parameters.
 * @param params.minPrice - Lowest price in the ladder.
 * @param params.maxPrice - Highest price in the ladder; must exceed `minPrice`.
 * @param params.count - Number of rungs.
 * @returns The rung prices, ascending.
 */
export declare function computeScalePriceLadder(params: {
    minPrice: number;
    maxPrice: number;
    count: number;
}): number[];
/**
 * Split a scale placement's total size across its ladder rungs.
 *
 * The split is done in whole units of the asset's size grid rather than in
 * decimal sizes: dividing and re-flooring in floating point loses a sub-unit of
 * dust on every rung, and a ladder that submits less than the size that was
 * validated is not the order the caller placed. Whatever does not divide evenly
 * goes onto the first rung, so the slices sum to exactly `totalSize`.
 *
 * The total is expected to sit on the grid already — `calculateFinalPositionSize`
 * floors it there — so rounding onto the grid here only absorbs representation
 * error. A total too small to give every rung a whole unit is rejected: placing
 * fewer orders than asked for would silently change the strategy.
 *
 * @param params - Split parameters.
 * @param params.totalSize - Total size to distribute.
 * @param params.count - Number of rungs.
 * @param params.szDecimals - The asset's size decimal precision.
 * @returns One size string per rung, in ladder order.
 */
export declare function splitScaleSizes(params: {
    totalSize: number;
    count: number;
    szDecimals: number;
}): string[];
/**
 * Calculates final position size using USD as source of truth with price validation
 *
 * This function implements the hybrid approach where USD is the source of truth,
 * but includes price staleness validation and proper rounding to prevent precision loss.
 *
 * @param params - USD amount, size, prices, and configuration
 * @returns Final position size as a number
 */
export declare function calculateFinalPositionSize(params: CalculateFinalPositionSizeParams): CalculateFinalPositionSizeResult;
/**
 * Calculates order price and formatted size based on order type
 *
 * @param params - Order parameters including type, direction, size, and prices
 * @returns Formatted order price, size, and price string
 */
export declare function calculateOrderPriceAndSize(params: CalculateOrderPriceAndSizeParams): CalculateOrderPriceAndSizeResult;
/**
 * Check that an order's prices and partial sizes survive the asset's precision.
 *
 * Validation elsewhere sees the values the caller supplied; this sees what the
 * exchange will actually receive. A positive value below the asset's tick
 * formats to `'0'`, which either changes the order's meaning (a zero-sized
 * trigger covers the whole position) or is rejected outright (a zero
 * `triggerPx`).
 *
 * Callers run this before taking any side effect — cancelling the position's
 * existing triggers, changing leverage, moving HIP-3 margin — so a value that
 * would only fail once the orders are built cannot leave a position stripped of
 * its protection, or an account with leverage moved, for an order that was
 * never going to be accepted.
 *
 * @param params - Price and size parameters
 * @param params.triggerPrice - Trigger price for a trigger placement, if any
 * @param params.takeProfitPrice - Attached take profit price, if any
 * @param params.stopLossPrice - Attached stop loss price, if any
 * @param params.takeProfitSize - Requested partial take profit size, if any
 * @param params.stopLossSize - Requested partial stop loss size, if any
 * @param params.szDecimals - Asset size decimals
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateOrderPrecision(params: {
    triggerPrice?: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    takeProfitSize?: string;
    stopLossSize?: string;
    szDecimals: number;
}): {
    isValid: boolean;
    error?: string;
};
/**
 * Format a partial TP/SL size, rejecting one that disappears at the asset
 * precision.
 *
 * Validation only sees the requested size, so a positive value below the
 * asset's precision (0.0004 against `szDecimals: 3`) passes and then formats to
 * `'0'`. HyperLiquid reads a zero-sized trigger as covering the whole position,
 * which would silently turn a partial TP/SL into a full close.
 *
 * @param params - Size parameters
 * @param params.size - The requested partial size
 * @param params.szDecimals - Asset size decimals
 * @returns The exchange-formatted size, guaranteed positive.
 */
export declare function formatPartialTpslSize(params: {
    size: string | number;
    szDecimals: number;
}): string;
/**
 * Builds orders array including main order and optional TP/SL orders
 *
 * @param params - Order construction parameters
 * @returns Array of SDK order params and grouping type
 */
export declare function buildOrdersArray(params: BuildOrdersArrayParams): BuildOrdersArrayResult;
export {};
//# sourceMappingURL=orderCalculations.d.mts.map