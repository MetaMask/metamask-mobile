import type { Order, PositionTriggerOrder } from "../types/index.mjs";
import type { OrderExecution, OrderType, StrategyOrderType, TriggerDirection, TriggerOrderType } from "../types/perps-types.mjs";
/**
 * All trigger placement types, in a stable order suitable for iteration
 * (validation tables, e2e matrices).
 */
export declare const TRIGGER_ORDER_TYPES: readonly ["stop_market", "stop_limit", "take_profit_market", "take_profit_limit"];
/**
 * All strategy placement types, in a stable order suitable for iteration
 * (validation tables, e2e matrices).
 */
export declare const STRATEGY_ORDER_TYPES: readonly ["twap", "scale", "chase"];
/**
 * Bounds on how many limit orders a scale placement may fan out into.
 *
 * A ladder needs at least two rungs to span a range at all; the upper bound
 * keeps a single placement from consuming a venue's per-account open-order
 * budget. Protocol-agnostic: a provider whose venue is stricter narrows this
 * further in its own validation.
 */
export declare const SCALE_ORDER_COUNT: {
    readonly min: 2;
    readonly max: 20;
};
/**
 * Check whether an order type is a trigger placement (stop / take profit).
 *
 * @param orderType - Order type to check.
 * @returns True when the type requires `OrderParams.triggerPrice`.
 */
export declare function isTriggerOrderType(orderType: OrderType): orderType is TriggerOrderType;
/**
 * Check whether an order type is a strategy placement (TWAP / scale / chase).
 *
 * @param orderType - Order type to check.
 * @returns True when the placement expands into an execution schedule rather
 * than a single order.
 */
export declare function isStrategyOrderType(orderType: OrderType): orderType is StrategyOrderType;
/**
 * Check whether an order type executes as a limit order.
 *
 * Covers plain limit orders and the `*_limit` trigger types, both of which
 * require `OrderParams.price`.
 *
 * @param orderType - Order type to check.
 * @returns True when the order executes as a limit order.
 */
export declare function isLimitExecutionOrderType(orderType: OrderType): boolean;
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
export declare function getTriggerExecution(orderType: OrderType): OrderExecution;
/**
 * Get the direction a trigger order fires in.
 *
 * @param orderType - Trigger order type.
 * @returns `'stop'` for `stop_*`, `'take_profit'` for `take_profit_*`.
 */
export declare function getTriggerDirection(orderType: TriggerOrderType): TriggerDirection;
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
export declare function classifyTriggerDirection(params: {
    triggerPrice?: string;
    entryPrice?: string;
    positionSize: string;
}): TriggerDirection | undefined;
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
export declare function buildPositionTriggerOrderFromOrder(params: {
    order: Order;
    positionSize: string;
    entryPrice?: string;
}): PositionTriggerOrder | undefined;
/**
 * Build a trigger order type from its two independent dimensions.
 *
 * @param params - Trigger dimensions.
 * @param params.direction - Whether the trigger is a stop or a take profit.
 * @param params.execution - How the order executes once triggered.
 * @returns The matching trigger order type.
 */
export declare function buildTriggerOrderType(params: {
    direction: TriggerDirection;
    execution: OrderExecution;
}): TriggerOrderType;
/**
 * Map the controller's time in force onto the exchange's spelling.
 *
 * Shared by the two order-building paths so they cannot drift apart.
 *
 * @param timeInForce - Requested time in force; defaults to GTC.
 * @returns The SDK time-in-force value.
 */
export declare function toSDKTimeInForce(timeInForce?: 'GTC' | 'IOC' | 'ALO'): 'Gtc' | 'Ioc' | 'Alo';
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
export declare function hashTriggerOrders(orders?: PositionTriggerOrder[]): string;
//# sourceMappingURL=orderTypes.d.mts.map