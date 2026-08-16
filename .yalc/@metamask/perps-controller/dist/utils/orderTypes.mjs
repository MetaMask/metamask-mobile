/**
 * All trigger placement types, in a stable order suitable for iteration
 * (validation tables, e2e matrices).
 */
export const TRIGGER_ORDER_TYPES = [
    'stop_market',
    'stop_limit',
    'take_profit_market',
    'take_profit_limit',
];
/**
 * All strategy placement types, in a stable order suitable for iteration
 * (validation tables, e2e matrices).
 */
export const STRATEGY_ORDER_TYPES = [
    'twap',
    'scale',
    'chase',
];
/**
 * Bounds on how many limit orders a scale placement may fan out into.
 *
 * A ladder needs at least two rungs to span a range at all; the upper bound
 * keeps a single placement from consuming a venue's per-account open-order
 * budget. Protocol-agnostic: a provider whose venue is stricter narrows this
 * further in its own validation.
 */
export const SCALE_ORDER_COUNT = { min: 2, max: 20 };
/**
 * Order types whose price field (`OrderParams.price`) is a real limit price the
 * exchange must honour, as opposed to a slippage cap derived from the market.
 */
const LIMIT_EXECUTION_ORDER_TYPES = [
    'limit',
    'stop_limit',
    'take_profit_limit',
];
/**
 * Order types that rest limit orders on the book, whatever decides their price.
 *
 * A superset of `LIMIT_EXECUTION_ORDER_TYPES`: a scale ladder and a chase both
 * rest limit orders, but they derive their own prices rather than taking one
 * from `OrderParams.price`, so they are limit *execution* without being
 * limit-*priced*. A TWAP is absent because its suborders cross the book.
 *
 * The distinction matters wherever execution is what is being charged or
 * bounded — fee tier, max order value — as opposed to where the caller's price
 * field is being read.
 */
const LIMIT_RESTING_ORDER_TYPES = [
    ...LIMIT_EXECUTION_ORDER_TYPES,
    'scale',
    'chase',
];
/**
 * Check whether an order type is a trigger placement (stop / take profit).
 *
 * @param orderType - Order type to check.
 * @returns True when the type requires `OrderParams.triggerPrice`.
 */
export function isTriggerOrderType(orderType) {
    return TRIGGER_ORDER_TYPES.includes(orderType);
}
/**
 * Check whether an order type is a strategy placement (TWAP / scale / chase).
 *
 * @param orderType - Order type to check.
 * @returns True when the placement expands into an execution schedule rather
 * than a single order.
 */
export function isStrategyOrderType(orderType) {
    return STRATEGY_ORDER_TYPES.includes(orderType);
}
/**
 * Check whether an order type executes as a limit order.
 *
 * Covers plain limit orders and the `*_limit` trigger types, both of which
 * require `OrderParams.price`.
 *
 * @param orderType - Order type to check.
 * @returns True when the order executes as a limit order.
 */
export function isLimitExecutionOrderType(orderType) {
    return LIMIT_EXECUTION_ORDER_TYPES.includes(orderType);
}
/**
 * Get how an order executes, ignoring whether it is trigger-gated.
 *
 * This is also the coarse execution type that consumers predating trigger orders
 * understand (fee tiers, max order value, analytics). It answers "does this rest
 * on the book or cross it", which is not the same question as
 * `isLimitExecutionOrderType` — a scale ladder and a chase rest limit orders
 * without carrying an `OrderParams.price`.
 *
 * @param orderType - Order type to inspect.
 * @returns `'limit'` for limit, `*_limit`, `scale` and `chase`; `'market'`
 * otherwise, including `twap`, whose suborders cross the book.
 */
export function getTriggerExecution(orderType) {
    return LIMIT_RESTING_ORDER_TYPES.includes(orderType)
        ? 'limit'
        : 'market';
}
/**
 * Get the direction a trigger order fires in.
 *
 * @param orderType - Trigger order type.
 * @returns `'stop'` for `stop_*`, `'take_profit'` for `take_profit_*`.
 */
export function getTriggerDirection(orderType) {
    return orderType === 'stop_market' || orderType === 'stop_limit'
        ? 'stop'
        : 'take_profit';
}
/**
 * Recover which way a trigger fires from its price relative to the entry.
 *
 * Used when the exchange reports a trigger without naming its placement type:
 * a long takes profit above its entry and stops out below, a short the other
 * way round. Shared by both transports so they classify identically.
 *
 * @param params - Classification parameters
 * @param params.triggerPrice - Price at which the order activates
 * @param params.entryPrice - Entry price of the position it is attached to
 * @param params.positionSize - Signed position size; its sign gives the side
 * @returns The direction, or undefined when there is nothing to compare against
 */
export function classifyTriggerDirection(params) {
    const { triggerPrice, entryPrice, positionSize } = params;
    const trigger = parseFloat(triggerPrice ?? '');
    const entry = parseFloat(entryPrice ?? '');
    const signedSize = parseFloat(positionSize || '0');
    if (!Number.isFinite(trigger) || !Number.isFinite(entry) || entry <= 0) {
        return undefined;
    }
    // A long takes profit above its entry and stops out below; a short is the
    // mirror image. A trigger sitting exactly at entry is neither, so both sides
    // fall to 'stop' — matching the legacy price fallback the scalar
    // takeProfitPrice/stopLossPrice fields still use. Splitting that tie the
    // other way would file the order under takeProfitOrders while the scalar
    // still reported it as a stop.
    const isLong = signedSize > 0;
    if (isLong) {
        return trigger > entry ? 'take_profit' : 'stop';
    }
    return trigger < entry ? 'take_profit' : 'stop';
}
/**
 * Project a normalized open order onto the position-state view of a trigger order.
 *
 * Returns undefined when the order is not a trigger, or when its direction can
 * be established neither from a named placement type nor from its price.
 *
 * @param params - Mapping parameters
 * @param params.order - Normalized open order
 * @param params.positionSize - Size of the position the trigger is attached to
 * @param params.entryPrice - Entry price, used to classify an unnamed trigger
 * @returns The position trigger order, or undefined
 */
export function buildPositionTriggerOrderFromOrder(params) {
    const { order, positionSize, entryPrice } = params;
    if (!order.isTrigger) {
        return undefined;
    }
    // HyperLiquid sometimes reports a bare 'Trigger', naming neither direction
    // nor execution. The direction is still recoverable from the trigger price
    // against the entry, and it is what decides which array the order belongs
    // to — so an unnamed trigger is kept rather than dropped, with its execution
    // mode left unstated. Without a position to compare against there is nothing
    // to recover, and it is dropped.
    const direction = order.triggerOrderType === undefined
        ? classifyTriggerDirection({
            triggerPrice: order.triggerPrice ?? order.price,
            entryPrice,
            positionSize,
        })
        : getTriggerDirection(order.triggerOrderType);
    if (!direction) {
        return undefined;
    }
    const absolutePositionSize = Math.abs(parseFloat(positionSize || '0'));
    const rawSize = Math.abs(parseFloat(order.size || '0'));
    // A position-bound TP/SL covers whatever the position currently is. The
    // exchange encodes that as size 0, but `adaptOrderFromSDK` has already
    // resolved it against the position as it stood when the order was adapted,
    // so the size carried here goes stale as soon as the position is resized.
    // The flag is the durable statement of what the trigger covers; the number
    // is not. Reading the number instead would report the old size, and would
    // call the order partial whenever the position had since grown.
    const isPositionBound = order.isPositionTpsl === true;
    const size = isPositionBound || rawSize === 0 ? absolutePositionSize : rawSize;
    return {
        orderId: order.orderId,
        direction,
        orderType: order.triggerOrderType,
        triggerPrice: order.triggerPrice ?? order.price,
        size: size.toString(),
        isPartial: !isPositionBound &&
            rawSize > 0 &&
            absolutePositionSize > 0 &&
            rawSize < absolutePositionSize,
        reduceOnly: Boolean(order.reduceOnly),
    };
}
/**
 * Build a trigger order type from its two independent dimensions.
 *
 * @param params - Trigger dimensions.
 * @param params.direction - Whether the trigger is a stop or a take profit.
 * @param params.execution - How the order executes once triggered.
 * @returns The matching trigger order type.
 */
export function buildTriggerOrderType(params) {
    const { direction, execution } = params;
    if (direction === 'stop') {
        return execution === 'limit' ? 'stop_limit' : 'stop_market';
    }
    return execution === 'limit' ? 'take_profit_limit' : 'take_profit_market';
}
/**
 * Map the controller's time in force onto the exchange's spelling.
 *
 * Shared by the two order-building paths so they cannot drift apart.
 *
 * @param timeInForce - Requested time in force; defaults to GTC.
 * @returns The SDK time-in-force value.
 */
export function toSDKTimeInForce(timeInForce) {
    switch (timeInForce) {
        case 'IOC':
            return 'Ioc';
        case 'ALO':
            return 'Alo';
        default:
            return 'Gtc';
    }
}
/**
 * Hash the identity of a position's trigger orders for change detection.
 *
 * Streamed positions only re-emit when their hash changes, so this has to move
 * when a trigger is added, removed, repriced, resized, or retyped — otherwise
 * subscribers never receive the updated arrays.
 *
 * The placement type is part of the identity because a trigger can be modified
 * in place: switching a stop from market to limit execution keeps its order ID,
 * trigger price, and size, so nothing else here would move even though the
 * execution semantics subscribers rely on have changed.
 *
 * @param orders - Trigger orders attached to a position, if any.
 * @returns A stable string; `'0'` for both empty and absent.
 */
export function hashTriggerOrders(orders) {
    if (!orders || orders.length === 0) {
        return '0';
    }
    return orders
        .map((order) => `${order.orderId}:${order.direction}:${order.orderType ?? '?'}@${order.triggerPrice}x${order.size}${order.isPartial ? 'p' : ''}`)
        .join(',');
}
//# sourceMappingURL=orderTypes.mjs.map