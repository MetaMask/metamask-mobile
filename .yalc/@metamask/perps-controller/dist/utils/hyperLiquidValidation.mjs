import { isValidHexAddress } from "@metamask/utils";
import { HYPERLIQUID_ASSET_CONFIGS, getSupportedAssets, TRADING_DEFAULTS } from "../constants/hyperLiquidConfig.mjs";
import { CHASE_ORDER_CONFIG, HYPERLIQUID_ORDER_LIMITS, HYPERLIQUID_TWAP_LIMITS } from "../constants/perpsConfig.mjs";
import { PERPS_ERROR_CODES } from "../perpsErrorCodes.mjs";
import { getTriggerExecution, isLimitExecutionOrderType, isStrategyOrderType, isTriggerOrderType, SCALE_ORDER_COUNT } from "./orderTypes.mjs";
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
export function createErrorResult(error, defaultResponse) {
    return {
        ...defaultResponse,
        success: false,
        error: error instanceof Error ? error.message : PERPS_ERROR_CODES.UNKNOWN_ERROR,
    };
}
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
export function validateWithdrawalParams(params, debugLogger) {
    debugLogger?.log('validateWithdrawalParams: Starting validation', {
        params,
        hasAssetId: Boolean(params.assetId),
        hasAmount: Boolean(params.amount),
        hasDestination: Boolean(params.destination),
    });
    // Validate required parameters
    if (!params.assetId) {
        debugLogger?.log('validateWithdrawalParams: Missing assetId', {
            error: PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
            params,
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.WITHDRAW_ASSET_ID_REQUIRED,
        };
    }
    // Validate amount
    if (!params.amount) {
        debugLogger?.log('validateWithdrawalParams: Missing amount', {
            error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
            params,
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_REQUIRED,
        };
    }
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
        debugLogger?.log('validateWithdrawalParams: Invalid amount', {
            error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE,
            amount: params.amount,
            parsedAmount: amount,
            isNaN: isNaN(amount),
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.WITHDRAW_AMOUNT_POSITIVE,
        };
    }
    // Validate destination address if provided
    if (params.destination && !isValidHexAddress(params.destination)) {
        debugLogger?.log('validateWithdrawalParams: Invalid destination address', {
            error: PERPS_ERROR_CODES.WITHDRAW_INVALID_DESTINATION,
            destination: params.destination,
            isValidHex: isValidHexAddress(params.destination),
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.WITHDRAW_INVALID_DESTINATION,
        };
    }
    debugLogger?.log('validateWithdrawalParams: All validations passed', {
        assetId: params.assetId,
        amount: params.amount,
        destination: params.destination ?? 'will use user wallet',
    });
    return { isValid: true };
}
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
export function validateDepositParams(params, debugLogger) {
    debugLogger?.log('validateDepositParams: Starting validation', {
        params,
        hasAssetId: Boolean(params.assetId),
        hasAmount: Boolean(params.amount),
        isTestnet: params.isTestnet,
    });
    // Validate required parameters
    if (!params.assetId) {
        debugLogger?.log('validateDepositParams: Missing assetId', {
            error: PERPS_ERROR_CODES.DEPOSIT_ASSET_ID_REQUIRED,
            params,
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.DEPOSIT_ASSET_ID_REQUIRED,
        };
    }
    // Validate amount
    if (!params.amount) {
        debugLogger?.log('validateDepositParams: Missing amount', {
            error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_REQUIRED,
            params,
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_REQUIRED,
        };
    }
    const amount = parseFloat(params.amount);
    if (isNaN(amount) || amount <= 0) {
        debugLogger?.log('validateDepositParams: Invalid amount', {
            error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
            amount: params.amount,
            parsedAmount: amount,
            isNaN: isNaN(amount),
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.DEPOSIT_AMOUNT_POSITIVE,
        };
    }
    // Check minimum deposit amount
    const minimumAmount = params.isTestnet
        ? TRADING_DEFAULTS.amount.testnet
        : TRADING_DEFAULTS.amount.mainnet;
    debugLogger?.log('validateDepositParams: Checking minimum amount', {
        amount,
        minimumAmount,
        isTestnet: params.isTestnet,
        network: params.isTestnet ? 'testnet' : 'mainnet',
    });
    if (amount < minimumAmount) {
        debugLogger?.log('validateDepositParams: Below minimum deposit', {
            error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
            amount,
            minimumAmount,
            difference: minimumAmount - amount,
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.DEPOSIT_MINIMUM_AMOUNT,
        };
    }
    debugLogger?.log('validateDepositParams: All validations passed', {
        assetId: params.assetId,
        amount: params.amount,
        parsedAmount: amount,
        minimumAmount,
        isTestnet: params.isTestnet,
    });
    return { isValid: true };
}
/**
 * Validate asset support for withdrawals using AssetRoute arrays.
 *
 * @param assetId - The CAIP asset ID to validate
 * @param supportedRoutes - Array of supported asset routes
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Validation result with isValid flag and optional error message
 */
export function validateAssetSupport(assetId, supportedRoutes, debugLogger) {
    debugLogger?.log('validateAssetSupport: Checking asset support', {
        assetId,
        supportedRoutesCount: supportedRoutes.length,
    });
    const supportedAssetIds = supportedRoutes.map((route) => route.assetId);
    // Check if asset is supported
    const isSupported = supportedAssetIds.includes(assetId);
    if (!isSupported) {
        // Also check case-insensitive match for contract addresses
        const isSupportedCaseInsensitive = supportedAssetIds.some((supportedId) => supportedId.toLowerCase() === assetId.toLowerCase());
        if (!isSupportedCaseInsensitive) {
            debugLogger?.log('validateAssetSupport: Asset not supported', {
                error: PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED,
                assetId,
                supportedAssetIds,
                checkedCaseInsensitive: true,
            });
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.WITHDRAW_ASSET_NOT_SUPPORTED,
            };
        }
        debugLogger?.log('⚠️ validateAssetSupport: Asset supported with case mismatch', {
            providedAssetId: assetId,
            matchedAssetId: supportedAssetIds.find((id) => id.toLowerCase() === assetId.toLowerCase()),
        });
    }
    debugLogger?.log('validateAssetSupport: Asset is supported', {
        assetId,
    });
    return { isValid: true };
}
/**
 * Validate balance against withdrawal amount.
 *
 * @param withdrawAmount - The amount to withdraw
 * @param withdrawableBalance - Max USD that can leave the venue right now
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Validation result with isValid flag and optional error message
 */
export function validateBalance(withdrawAmount, withdrawableBalance, debugLogger) {
    debugLogger?.log('validateBalance: Checking balance sufficiency', {
        withdrawAmount,
        withdrawableBalance,
        difference: withdrawableBalance - withdrawAmount,
    });
    if (withdrawAmount > withdrawableBalance) {
        const shortfall = withdrawAmount - withdrawableBalance;
        debugLogger?.log('validateBalance: Insufficient balance', {
            error: PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE,
            withdrawAmount,
            withdrawableBalance,
            shortfall,
            percentageOfAvailable: `${((withdrawAmount / withdrawableBalance) * 100).toFixed(2)}%`,
        });
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.WITHDRAW_INSUFFICIENT_BALANCE,
        };
    }
    const remainingBalance = withdrawableBalance - withdrawAmount;
    debugLogger?.log('validateBalance: Balance is sufficient', {
        withdrawAmount,
        withdrawableBalance,
        remainingBalance,
        percentageUsed: `${((withdrawAmount / withdrawableBalance) * 100).toFixed(2)}%`,
    });
    return { isValid: true };
}
/**
 * Apply filters to asset paths with comprehensive logging.
 *
 * @param assets - Array of CAIP asset IDs to filter
 * @param params - Filter parameters including chainId, symbol, and assetId
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Filtered array of CAIP asset IDs
 */
export function applyPathFilters(assets, params, debugLogger) {
    if (!params) {
        debugLogger?.log('HyperLiquid: applyPathFilters - no params, returning all assets', { assets });
        return assets;
    }
    let filtered = assets;
    debugLogger?.log('HyperLiquid: applyPathFilters - starting filter', {
        initialAssets: assets,
        filterParams: params,
    });
    if (params.chainId) {
        const before = filtered;
        filtered = filtered.filter((asset) => asset.startsWith(params.chainId));
        debugLogger?.log('HyperLiquid: applyPathFilters - chainId filter', {
            chainId: params.chainId,
            before,
            after: filtered,
        });
    }
    // Note: `in` is the idiomatic TypeScript way to narrow a string to
    // `keyof typeof` for indexed access; `hasProperty` types the indexed
    // result as `unknown` and loses the `{ testnet, mainnet }` shape.
    /* eslint-disable-next-line no-restricted-syntax */
    if (params.symbol && params.symbol in HYPERLIQUID_ASSET_CONFIGS) {
        const config = HYPERLIQUID_ASSET_CONFIGS[params.symbol];
        const isTestnet = params.isTestnet ?? false;
        const selectedAsset = isTestnet ? config.testnet : config.mainnet;
        const before = filtered;
        filtered = [selectedAsset];
        debugLogger?.log('HyperLiquid: applyPathFilters - symbol filter', {
            symbol: params.symbol,
            isTestnet,
            config,
            selectedAsset,
            before,
            after: filtered,
        });
    }
    if (params.assetId) {
        const before = filtered;
        // Use case-insensitive comparison for asset ID matching to handle address case differences
        filtered = filtered.filter((asset) => asset.toLowerCase() === params.assetId?.toLowerCase());
        debugLogger?.log('HyperLiquid: applyPathFilters - assetId filter', {
            assetId: params.assetId,
            before,
            after: filtered,
            exactMatch: before.includes(params.assetId),
            caseInsensitiveMatch: before.some((asset) => asset.toLowerCase() === params.assetId?.toLowerCase()),
        });
    }
    debugLogger?.log('HyperLiquid: applyPathFilters - final result', {
        initialAssets: assets,
        finalFiltered: filtered,
        filterParams: params,
    });
    return filtered;
}
/**
 * Get supported deposit/withdrawal paths with filtering.
 *
 * @param params - Filter parameters including isTestnet, chainId, symbol
 * @param debugLogger - Optional debug logger for detailed logging
 * @returns Array of supported CAIP asset IDs
 */
export function getSupportedPaths(params, debugLogger) {
    const isTestnet = params?.isTestnet ?? false;
    const assets = getSupportedAssets(isTestnet);
    const filteredAssets = applyPathFilters(assets, params, debugLogger);
    debugLogger?.log('HyperLiquid: getSupportedPaths', {
        isTestnet,
        requestedParams: params,
        allAssets: assets,
        filteredAssets,
        returnType: 'CaipAssetId[]',
        example: filteredAssets[0],
    });
    return filteredAssets;
}
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
export function getMaxOrderValue(maxLeverage, orderType) {
    let marketLimit;
    if (maxLeverage >= 25) {
        marketLimit = HYPERLIQUID_ORDER_LIMITS.MarketOrderLimits.HighLeverage;
    }
    else if (maxLeverage >= 20) {
        marketLimit = HYPERLIQUID_ORDER_LIMITS.MarketOrderLimits.MediumHighLeverage;
    }
    else if (maxLeverage >= 10) {
        marketLimit = HYPERLIQUID_ORDER_LIMITS.MarketOrderLimits.MediumLeverage;
    }
    else {
        marketLimit = HYPERLIQUID_ORDER_LIMITS.MarketOrderLimits.LowLeverage;
    }
    // The higher cap follows how the order executes, not whose price it uses: a
    // scale ladder and a chase rest limit orders on the book, so holding them to
    // the tighter market-order cap would bound them by how they were requested
    // rather than by what they do.
    return getTriggerExecution(orderType) === 'limit'
        ? marketLimit * HYPERLIQUID_ORDER_LIMITS.LimitOrderMultiplier
        : marketLimit;
}
/**
 * The `grouping` value each provider-agnostic linkage corresponds to, used to
 * detect a caller supplying both spellings with different meanings.
 */
const TPSL_LINKAGE_GROUPING = {
    none: 'na',
    order: 'normalTpsl',
    position: 'positionTpsl',
};
/**
 * Which strategy owns each strategy-only field.
 *
 * Anything a placement does not own is rejected rather than ignored: a `twap`
 * carrying `scaleNumOrders` is a caller mistake, and dropping it silently would
 * execute something other than what was asked for.
 */
const STRATEGY_FIELD_OWNER = {
    twapDuration: 'twap',
    twapRandomize: 'twap',
    scaleMinPrice: 'scale',
    scaleMaxPrice: 'scale',
    scaleNumOrders: 'scale',
    chaseIntervalMs: 'chase',
    chaseMaxDurationMs: 'chase',
    chaseMaxRepricings: 'chase',
};
/**
 * Validate the TWAP-specific parameters of a `twap` placement.
 *
 * @param params - Strategy fields supplied by the caller.
 * @returns Validation result with isValid flag and optional error message.
 */
function validateTwapParams(params) {
    if (params.twapDuration === undefined) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_TWAP_DURATION_REQUIRED,
        };
    }
    // The venue validates `twap.m` as a safe integer within these bounds before
    // the request is signed, so checking it here turns an opaque SDK failure into
    // a typed rejection that costs no round trip.
    if (!Number.isInteger(params.twapDuration) ||
        params.twapDuration < HYPERLIQUID_TWAP_LIMITS.MinDurationMinutes ||
        params.twapDuration > HYPERLIQUID_TWAP_LIMITS.MaxDurationMinutes) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_TWAP_DURATION_INVALID,
        };
    }
    return { isValid: true };
}
/**
 * Validate the ladder parameters of a `scale` placement.
 *
 * @param params - Strategy fields supplied by the caller.
 * @returns Validation result with isValid flag and optional error message.
 */
function validateScaleParams(params) {
    if (params.scaleMinPrice === undefined ||
        params.scaleMaxPrice === undefined) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SCALE_RANGE_REQUIRED,
        };
    }
    const minPrice = parseFloat(params.scaleMinPrice);
    const maxPrice = parseFloat(params.scaleMaxPrice);
    if (!Number.isFinite(minPrice) ||
        !Number.isFinite(maxPrice) ||
        minPrice <= 0 ||
        maxPrice <= minPrice) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SCALE_RANGE_INVALID,
        };
    }
    if (params.scaleNumOrders === undefined ||
        !Number.isInteger(params.scaleNumOrders) ||
        params.scaleNumOrders < SCALE_ORDER_COUNT.min ||
        params.scaleNumOrders > SCALE_ORDER_COUNT.max) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SCALE_COUNT_INVALID,
        };
    }
    return { isValid: true };
}
/**
 * Validate the polling parameters of a `chase` placement.
 *
 * @param params - Strategy fields supplied by the caller.
 * @returns Validation result with isValid flag and optional error message.
 */
function validateChaseParams(params) {
    const interval = params.chaseIntervalMs ?? CHASE_ORDER_CONFIG.DefaultIntervalMs;
    if (!Number.isFinite(interval) ||
        interval < CHASE_ORDER_CONFIG.MinIntervalMs) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_CHASE_INTERVAL_INVALID,
        };
    }
    const maxDuration = params.chaseMaxDurationMs ?? CHASE_ORDER_CONFIG.DefaultMaxDurationMs;
    // A window shorter than one poll would place the order and immediately stop
    // chasing it — a plain post-only limit order wearing a chase's name.
    if (!Number.isFinite(maxDuration) || maxDuration < interval) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_CHASE_DURATION_INVALID,
        };
    }
    const maxRepricings = params.chaseMaxRepricings ?? CHASE_ORDER_CONFIG.DefaultMaxRepricings;
    if (!Number.isInteger(maxRepricings) || maxRepricings < 1) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_CHASE_DURATION_INVALID,
        };
    }
    return { isValid: true };
}
/**
 * Validate strategy placement parameters, and the absence of them.
 *
 * Runs before every other order rule so a strategy placement is rejected with a
 * strategy-shaped reason rather than with the trigger/limit rule its shape
 * happens to trip first.
 *
 * @param params - Order parameters to validate.
 * @param params.orderType - The order placement type.
 * @returns Validation result with isValid flag and optional error message.
 */
function validateStrategyOrderParams(params) {
    const { orderType } = params;
    const strategy = orderType !== undefined && isStrategyOrderType(orderType)
        ? orderType
        : undefined;
    // Every strategy-only field must belong to the placement carrying it. This
    // also covers the non-strategy case, where no field has an owner to match.
    const foreignField = Object.keys(STRATEGY_FIELD_OWNER).find((field) => params[field] !== undefined && STRATEGY_FIELD_OWNER[field] !== strategy);
    if (foreignField) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_STRATEGY_PARAMS_NOT_SUPPORTED,
        };
    }
    if (!strategy) {
        return { isValid: true };
    }
    // A strategy owns its own execution: it derives its own prices, rests its own
    // orders, and decides its own time in force. Accepting these fields would
    // mean quietly ignoring them.
    //
    // `clientOrderId` is refused for the same reason and cannot be honoured even
    // in principle: the venue's TWAP action carries no client id, a scale ladder
    // is many orders and a client id must be unique per order, and a chase
    // replaces its order on every re-price. One id cannot name any of them.
    if (params.price !== undefined ||
        params.triggerPrice !== undefined ||
        params.timeInForce !== undefined ||
        params.clientOrderId !== undefined ||
        params.takeProfitPrice !== undefined ||
        params.stopLossPrice !== undefined ||
        params.takeProfitSize !== undefined ||
        params.stopLossSize !== undefined) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_STRATEGY_FIELD_UNSUPPORTED,
        };
    }
    if (strategy === 'twap') {
        return validateTwapParams(params);
    }
    if (strategy === 'scale') {
        return validateScaleParams(params);
    }
    return validateChaseParams(params);
}
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
export function validateOrderParams(params) {
    if (!params.coin) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_COIN_REQUIRED,
        };
    }
    // Note: Size validation removed - validateOrder handles amount validation using USD as source of truth
    // Strategy placements are decided first: their shape trips the limit-price and
    // trigger rules below, and the strategy-shaped reason is the useful one.
    const strategyValidation = validateStrategyOrderParams(params);
    if (!strategyValidation.isValid) {
        return strategyValidation;
    }
    const { orderType } = params;
    const isTrigger = orderType !== undefined && isTriggerOrderType(orderType);
    // Require price for orders that execute as limit orders (limit, stop_limit,
    // take_profit_limit)
    if (orderType !== undefined &&
        isLimitExecutionOrderType(orderType) &&
        !params.price) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
        };
    }
    if (params.price && parseFloat(params.price) <= 0) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_PRICE_POSITIVE,
        };
    }
    if (isTrigger) {
        if (!params.triggerPrice) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED,
            };
        }
        const triggerPrice = parseFloat(params.triggerPrice);
        if (isNaN(triggerPrice) || triggerPrice <= 0) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_POSITIVE,
            };
        }
        // A trigger placement combined with attached TP/SL children is rejected
        // rather than silently reshaped: the exchange semantics of a triggered
        // parent owning triggered children are not part of this contract.
        // Each field is checked explicitly: a falsy-but-present price (e.g. '') is
        // still an attached TP/SL request and must be rejected, not skipped.
        if (params.takeProfitPrice !== undefined ||
            params.stopLossPrice !== undefined) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TRIGGER_TPSL_UNSUPPORTED,
            };
        }
        // Consistent with the attached-TP/SL check above: a falsy-but-present value
        // (e.g. '') is still a request to place a trigger, not an absent field.
    }
    else if (params.triggerPrice !== undefined) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_NOT_SUPPORTED,
        };
    }
    // `tpslLinkage` supersedes `grouping`, but two spellings that disagree are a
    // caller mistake — resolving one silently would hide it.
    if (params.tpslLinkage !== undefined && params.grouping !== undefined) {
        const expectedGrouping = TPSL_LINKAGE_GROUPING[params.tpslLinkage];
        if (expectedGrouping !== params.grouping) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TPSL_LINKAGE_CONFLICT,
            };
        }
    }
    const hasAttachedTpsl = params.takeProfitPrice !== undefined || params.stopLossPrice !== undefined;
    // Every order in a `positionTpsl` batch has to be a trigger order, and no
    // shape of order placement produces one. With an attached TP/SL the batch
    // carries the ordinary parent order the TP/SL protects; without one it is
    // that parent order alone. HyperLiquid rejects both, so the linkage is
    // refused outright — it belongs to `updatePositionTPSL`, applied to the
    // position once the parent has filled.
    const requestsPositionLinkage = params.tpslLinkage === 'position' || params.grouping === 'positionTpsl';
    if (requestsPositionLinkage) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_TPSL_POSITION_LINKAGE_UNSUPPORTED,
        };
    }
    // `na` grouping submits the attached TP/SL as standalone triggers, bound to
    // neither the parent order nor the resulting position. An unfilled parent
    // then leaves them behind as orphan reduce-only triggers that fire against
    // whatever position happens to exist. An attached TP/SL needs a linkage that
    // links it, so the combination is a caller mistake rather than a mode.
    const requestsNoLinkage = params.tpslLinkage === 'none' || params.grouping === 'na';
    if (requestsNoLinkage && hasAttachedTpsl) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_TPSL_LINKAGE_REQUIRED,
        };
    }
    // Only a plain limit order rests on the book long enough for a time in force to
    // mean anything: a market order fills immediately and a trigger order's
    // execution is decided when it fires. Rejected here, at step 1 of placement, so
    // it cannot fire after leverage changes or a HIP-3 margin transfer.
    if (params.timeInForce !== undefined && orderType !== 'limit') {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED,
        };
    }
    const partialTpslValidation = validatePartialTpslSizes(params);
    if (!partialTpslValidation.isValid) {
        return partialTpslValidation;
    }
    return { isValid: true };
}
/**
 * Validate quantity-scoped (partial) TP/SL sizes against the parent order.
 *
 * @param params - Order parameters carrying the TP/SL prices and sizes
 * @param params.size - Parent order size
 * @param params.takeProfitPrice - Attached take profit price
 * @param params.stopLossPrice - Attached stop loss price
 * @param params.takeProfitSize - Partial take profit size
 * @param params.stopLossSize - Partial stop loss size
 * @returns Validation result with isValid flag and optional error message
 */
function validatePartialTpslSizes(params) {
    const orderSize = params.size ? Math.abs(parseFloat(params.size)) : undefined;
    const entries = [
        { size: params.takeProfitSize, price: params.takeProfitPrice },
        { size: params.stopLossSize, price: params.stopLossPrice },
    ];
    for (const entry of entries) {
        if (entry.size === undefined) {
            continue;
        }
        // A size without its price would silently place nothing.
        if (!entry.price) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID,
            };
        }
        const size = parseFloat(entry.size);
        if (isNaN(size) || size <= 0) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID,
            };
        }
        if (orderSize !== undefined && !isNaN(orderSize) && size > orderSize) {
            return {
                isValid: false,
                error: PERPS_ERROR_CODES.ORDER_TPSL_SIZE_INVALID,
            };
        }
    }
    return { isValid: true };
}
/**
 * Validate coin exists in asset mapping.
 *
 * @param coin - The coin symbol to validate
 * @param coinToAssetId - Map of coin symbols to asset IDs
 * @returns Validation result with isValid flag and optional error message
 */
export function validateCoinExists(coin, coinToAssetId) {
    if (!coinToAssetId.has(coin)) {
        return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_UNKNOWN_COIN,
        };
    }
    return { isValid: true };
}
//# sourceMappingURL=hyperLiquidValidation.mjs.map