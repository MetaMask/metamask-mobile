/**
 * MYX Protocol Type Definitions
 *
 * SDK types re-exported with MYX prefix for consistency.
 * Includes types for market display, positions, orders, and trading.
 */
// SDK enums (re-exported as types since they're const objects in the SDK)
export { Direction as MYXDirection, OrderType as MYXOrderType, OperationType as MYXOperationType, TriggerType as MYXTriggerType, OrderStatus as MYXOrderStatus, TimeInForce as MYXTimeInForce } from "@myx-trade/sdk";
// History enums
export { DirectionEnum as MYXDirectionEnum, OrderTypeEnum as MYXOrderTypeEnum, OperationEnum as MYXOperationEnum, OrderStatusEnum as MYXOrderStatusEnum, ExecTypeEnum as MYXExecTypeEnum, TradeFlowTypeEnum as MYXTradeFlowTypeEnum } from "@myx-trade/sdk";
// ============================================================================
// Market Overlap Configuration
// ============================================================================
/**
 * Markets that overlap with HyperLiquid
 * These are excluded from MYX display in v1.0 to avoid confusion
 * In Stage 7, we'll implement market collision handling
 */
export const MYX_HL_OVERLAPPING_MARKETS = [
    'BTC',
    'ETH',
    'BNB',
    'PUMP',
    'WLFI',
];
//# sourceMappingURL=myx-types.mjs.map