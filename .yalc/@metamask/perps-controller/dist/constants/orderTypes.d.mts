/**
 * Detailed order types from HyperLiquid API
 */
export declare const DETAILED_ORDER_TYPES: {
    readonly LIMIT: "Limit";
    readonly MARKET: "Market";
    readonly STOP_LIMIT: "Stop Limit";
    readonly STOP_MARKET: "Stop Market";
    readonly TAKE_PROFIT_LIMIT: "Take Profit Limit";
    readonly TAKE_PROFIT_MARKET: "Take Profit Market";
};
/**
 * Check if an order type is a TP/SL order
 *
 * @param detailedOrderType - The detailed order type string to check.
 * @returns True if the order type is a take-profit or stop-loss variant.
 */
export declare const isTPSLOrder: (detailedOrderType?: string) => boolean;
//# sourceMappingURL=orderTypes.d.mts.map