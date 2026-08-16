import type { CaipAssetId, Hex } from "@metamask/utils";
import type { GetSupportedPathsParams, PerpsDebugLogger } from "../types/index.mjs";
import type { OrderType, TpslLinkage } from "../types/perps-types.mjs";
/**
 * Optional debug logger for validation functions.
 * When provided, enables detailed logging for debugging.
 * When omitted, validation runs silently.
 */
export type ValidationDebugLogger = PerpsDebugLogger | undefined;
/**
 * Validation utilities for HyperLiquid operations
 */
/**
 * Create standardized error response.
 *
 * @param error - The error that occurred
 * @param defaultResponse - The default response object to use as template
 * @returns The error response with success=false and error message
 */
export declare function createErrorResult<TValue extends {
    success: boolean;
    error?: string;
}>(error: unknown, defaultResponse: TValue): TValue;
/**
 * Validate withdrawal parameters.
 *
 * @param params - Withdrawal parameters to validate
 * @param params.assetId - The CAIP asset ID to withdraw
 * @param params.amount - Amount to withdraw as string
 * @param params.destination - Optional destination hex address
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateWithdrawalParams(params: {
    assetId?: CaipAssetId;
    amount?: string;
    destination?: Hex;
}, debugLogger?: ValidationDebugLogger): {
    isValid: boolean;
    error?: string;
};
/**
 * Validate deposit parameters.
 *
 * @param params - Deposit parameters to validate
 * @param params.assetId - The CAIP asset ID to deposit
 * @param params.amount - Amount to deposit as string
 * @param params.isTestnet - Whether this is a testnet deposit
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateDepositParams(params: {
    assetId?: CaipAssetId;
    amount?: string;
    isTestnet?: boolean;
}, debugLogger?: ValidationDebugLogger): {
    isValid: boolean;
    error?: string;
};
/**
 * Validate asset support for withdrawals using AssetRoute arrays.
 *
 * @param assetId - The CAIP asset ID to validate
 * @param supportedRoutes - Array of supported asset routes
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateAssetSupport(assetId: CaipAssetId, supportedRoutes: {
    assetId: CaipAssetId;
}[], debugLogger?: ValidationDebugLogger): {
    isValid: boolean;
    error?: string;
};
/**
 * Validate balance against withdrawal amount.
 *
 * @param withdrawAmount - The amount to withdraw
 * @param withdrawableBalance - Max USD that can leave the venue right now
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateBalance(withdrawAmount: number, withdrawableBalance: number, debugLogger?: ValidationDebugLogger): {
    isValid: boolean;
    error?: string;
};
/**
 * Apply filters to asset paths with comprehensive logging.
 *
 * @param assets - Array of CAIP asset IDs to filter
 * @param params - Filter parameters including chainId, symbol, and assetId
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Filtered array of CAIP asset IDs
 */
export declare function applyPathFilters(assets: CaipAssetId[], params?: GetSupportedPathsParams, debugLogger?: ValidationDebugLogger): CaipAssetId[];
/**
 * Get supported deposit/withdrawal paths with filtering.
 *
 * @param params - Filter parameters including isTestnet, chainId, symbol
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Array of supported CAIP asset IDs
 */
export declare function getSupportedPaths(params?: GetSupportedPathsParams, debugLogger?: ValidationDebugLogger): CaipAssetId[];
/**
 * Get maximum order value based on leverage and order type.
 * Based on HyperLiquid contract specifications.
 *
 * @param maxLeverage - The maximum leverage for the market
 * @param orderType - The order type; every type follows the limit/market
 * multiplier of its execution mode, so `stop_limit`, `scale` and `chase` are all
 * treated as limit orders and `twap` as a market order
 * @returns Maximum order value in USD
 */
export declare function getMaxOrderValue(maxLeverage: number, orderType: OrderType): number;
/**
 * The strategy-placement fields of `OrderParams`, as validation sees them.
 *
 * Named so the provider can forward exactly this group to `validateOrderParams`
 * without the field list drifting between the two call sites.
 */
export type StrategyOrderValidationParams = {
    twapDuration?: number;
    twapRandomize?: boolean;
    scaleMinPrice?: string;
    scaleMaxPrice?: string;
    scaleNumOrders?: number;
    chaseIntervalMs?: number;
    chaseMaxDurationMs?: number;
    chaseMaxRepricings?: number;
};
/**
 * Validate order parameters.
 * Basic validation - checks required fields are present.
 * Amount validation (size/USD) is handled by validateOrder.
 *
 * @param params - Order parameters to validate
 * @param params.coin - The trading pair coin symbol
 * @param params.size - The order size as string
 * @param params.price - The order price as string
 * @param params.orderType - The order placement type
 * @param params.triggerPrice - Trigger price; required for trigger placement types and
 * rejected for market/limit orders so a stray value can never be silently dropped
 * @param params.takeProfitPrice - Attached take profit price
 * @param params.stopLossPrice - Attached stop loss price
 * @param params.takeProfitSize - Partial take profit size
 * @param params.stopLossSize - Partial stop loss size
 * @param params.tpslLinkage - How an attached TP/SL is linked
 * @param params.grouping - Deprecated protocol-shaped spelling of `tpslLinkage`
 * @param params.timeInForce - Time in force; only a plain limit order can carry one
 * @param params.clientOrderId - Client-provided order ID; a strategy placement cannot carry one
 * @param params.twapDuration - TWAP window in whole minutes
 * @param params.twapRandomize - Whether to randomize the TWAP slice timing
 * @param params.scaleMinPrice - Lowest price in a scale ladder
 * @param params.scaleMaxPrice - Highest price in a scale ladder
 * @param params.scaleNumOrders - How many orders a scale ladder fans out into
 * @param params.chaseIntervalMs - How often a chase re-reads the touch
 * @param params.chaseMaxDurationMs - How long a chase keeps re-pricing
 * @param params.chaseMaxRepricings - Cap on a chase's cancel/replace cycles
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateOrderParams(params: StrategyOrderValidationParams & {
    coin?: string;
    size?: string;
    price?: string;
    orderType?: OrderType;
    triggerPrice?: string;
    takeProfitPrice?: string;
    stopLossPrice?: string;
    takeProfitSize?: string;
    stopLossSize?: string;
    tpslLinkage?: TpslLinkage;
    grouping?: 'na' | 'normalTpsl' | 'positionTpsl';
    timeInForce?: 'GTC' | 'IOC' | 'ALO';
    clientOrderId?: string;
}): {
    isValid: boolean;
    error?: string;
};
/**
 * Validate coin exists in asset mapping.
 *
 * @param coin - The coin symbol to validate
 * @param coinToAssetId - Map of coin symbols to asset IDs
 * @returns Validation result with isValid flag and optional error message
 */
export declare function validateCoinExists(coin: string, coinToAssetId: Map<string, number>): {
    isValid: boolean;
    error?: string;
};
//# sourceMappingURL=hyperLiquidValidation.d.mts.map