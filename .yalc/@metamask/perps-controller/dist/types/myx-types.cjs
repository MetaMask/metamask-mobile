"use strict";
/**
 * MYX Protocol Type Definitions
 *
 * SDK types re-exported with MYX prefix for consistency.
 * Includes types for market display, positions, orders, and trading.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MYX_HL_OVERLAPPING_MARKETS = exports.MYXTradeFlowTypeEnum = exports.MYXExecTypeEnum = exports.MYXOrderStatusEnum = exports.MYXOperationEnum = exports.MYXOrderTypeEnum = exports.MYXDirectionEnum = exports.MYXTimeInForce = exports.MYXOrderStatus = exports.MYXTriggerType = exports.MYXOperationType = exports.MYXOrderType = exports.MYXDirection = void 0;
// SDK enums (re-exported as types since they're const objects in the SDK)
var sdk_1 = require("@myx-trade/sdk");
Object.defineProperty(exports, "MYXDirection", { enumerable: true, get: function () { return sdk_1.Direction; } });
Object.defineProperty(exports, "MYXOrderType", { enumerable: true, get: function () { return sdk_1.OrderType; } });
Object.defineProperty(exports, "MYXOperationType", { enumerable: true, get: function () { return sdk_1.OperationType; } });
Object.defineProperty(exports, "MYXTriggerType", { enumerable: true, get: function () { return sdk_1.TriggerType; } });
Object.defineProperty(exports, "MYXOrderStatus", { enumerable: true, get: function () { return sdk_1.OrderStatus; } });
Object.defineProperty(exports, "MYXTimeInForce", { enumerable: true, get: function () { return sdk_1.TimeInForce; } });
// History enums
var sdk_2 = require("@myx-trade/sdk");
Object.defineProperty(exports, "MYXDirectionEnum", { enumerable: true, get: function () { return sdk_2.DirectionEnum; } });
Object.defineProperty(exports, "MYXOrderTypeEnum", { enumerable: true, get: function () { return sdk_2.OrderTypeEnum; } });
Object.defineProperty(exports, "MYXOperationEnum", { enumerable: true, get: function () { return sdk_2.OperationEnum; } });
Object.defineProperty(exports, "MYXOrderStatusEnum", { enumerable: true, get: function () { return sdk_2.OrderStatusEnum; } });
Object.defineProperty(exports, "MYXExecTypeEnum", { enumerable: true, get: function () { return sdk_2.ExecTypeEnum; } });
Object.defineProperty(exports, "MYXTradeFlowTypeEnum", { enumerable: true, get: function () { return sdk_2.TradeFlowTypeEnum; } });
// ============================================================================
// Market Overlap Configuration
// ============================================================================
/**
 * Markets that overlap with HyperLiquid
 * These are excluded from MYX display in v1.0 to avoid confusion
 * In Stage 7, we'll implement market collision handling
 */
exports.MYX_HL_OVERLAPPING_MARKETS = [
    'BTC',
    'ETH',
    'BNB',
    'PUMP',
    'WLFI',
];
//# sourceMappingURL=myx-types.cjs.map