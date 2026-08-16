"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTPSLOrder = exports.DETAILED_ORDER_TYPES = void 0;
/**
 * Detailed order types from HyperLiquid API
 */
exports.DETAILED_ORDER_TYPES = {
    LIMIT: 'Limit',
    MARKET: 'Market',
    STOP_LIMIT: 'Stop Limit',
    STOP_MARKET: 'Stop Market',
    TAKE_PROFIT_LIMIT: 'Take Profit Limit',
    TAKE_PROFIT_MARKET: 'Take Profit Market',
};
/**
 * Check if an order type is a TP/SL order
 *
 * @param detailedOrderType - The detailed order type string to check.
 * @returns True if the order type is a take-profit or stop-loss variant.
 */
const isTPSLOrder = (detailedOrderType) => {
    if (!detailedOrderType) {
        return false;
    }
    return (detailedOrderType === exports.DETAILED_ORDER_TYPES.STOP_LIMIT ||
        detailedOrderType === exports.DETAILED_ORDER_TYPES.STOP_MARKET ||
        detailedOrderType === exports.DETAILED_ORDER_TYPES.TAKE_PROFIT_LIMIT ||
        detailedOrderType === exports.DETAILED_ORDER_TYPES.TAKE_PROFIT_MARKET);
};
exports.isTPSLOrder = isTPSLOrder;
//# sourceMappingURL=orderTypes.cjs.map