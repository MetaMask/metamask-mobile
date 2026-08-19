"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adaptHyperLiquidLedgerUpdateToUserHistoryItem = exports.parseAssetName = exports.calculateHip3AssetId = exports.calculatePositionSize = exports.formatHyperLiquidSize = exports.formatHyperLiquidPrice = exports.buildAssetMapping = exports.adaptAccountStateFromSDK = exports.adaptMarketFromSDK = exports.adaptPositionTriggerOrderFromSDK = exports.adaptTriggerOrderTypeFromSDK = exports.adaptOrderFromSDK = exports.adaptPositionFromSDK = exports.adaptTpslLinkageToGrouping = exports.adaptOrderToSDK = void 0;
const utils_1 = require("@metamask/utils");
const hyperLiquidConfig_js_1 = require("../constants/hyperLiquidConfig.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const perpsErrorCodes_js_1 = require("../perpsErrorCodes.cjs");
const orderTypes_js_1 = require("./orderTypes.cjs");
const significantFigures_js_1 = require("./significantFigures.cjs");
const readOptionalString = (value) => typeof value === 'string' && value.length > 0 ? value : undefined;
const readOptionalOrderId = (value) => {
    if (typeof value === 'string' && value.length > 0) {
        return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value.toString();
    }
    return undefined;
};
const getParentTpslMetadata = (rawOrder) => ({
    takeProfitPrice: readOptionalString(rawOrder.takeProfitPrice),
    stopLossPrice: readOptionalString(rawOrder.stopLossPrice),
    takeProfitOrderId: readOptionalOrderId(rawOrder.takeProfitOrderId),
    stopLossOrderId: readOptionalOrderId(rawOrder.stopLossOrderId),
});
/**
 * HyperLiquid SDK Adapter Utilities
 *
 * These functions transform between MetaMask Perps API types and HyperLiquid SDK types.
 * The SDK uses cryptic property names for efficiency, but our API uses descriptive names
 * to provide a consistent interface across different perps protocols.
 */
function adaptOrderToSDK(order, symbolToAssetId) {
    const assetId = symbolToAssetId.get(order.symbol);
    if (assetId === undefined) {
        const availableDexs = new Set();
        symbolToAssetId.forEach((_, symbol) => {
            if (symbol.includes(':')) {
                const dex = symbol.split(':')[0];
                availableDexs.add(dex);
            }
        });
        const dexHint = availableDexs.size > 0
            ? ` Available HIP-3 DEXs: ${Array.from(availableDexs).join(', ')}`
            : ' No HIP-3 DEXs currently available.';
        throw new Error(`Asset ${order.symbol} not found in asset mapping.${dexHint} Check console logs for "HyperLiquidProvider: Asset mapping built" to see available assets.`);
    }
    return {
        a: assetId,
        b: order.isBuy,
        p: order.price ?? resolveTriggerCapPrice(order) ?? '0',
        s: order.size,
        r: order.reduceOnly ?? false,
        t: adaptOrderTypeToSDK(order),
        c: order.clientOrderId && (0, utils_1.isHexString)(order.clientOrderId)
            ? order.clientOrderId
            : undefined,
    };
}
exports.adaptOrderToSDK = adaptOrderToSDK;
/**
 * Derive the slippage cap a market-on-trigger order submits as its price.
 *
 * A `stop_market` / `take_profit_market` order legitimately carries no limit
 * price, but the SDK still requires a positive `p` — it is the cap the order
 * fills against once the trigger fires, not a resting price. Sending `'0'`
 * fails SDK validation before the request is ever made.
 *
 * The cap follows the order's own tolerance, matching `calculateOrderPriceAndSize`
 * on the `placeOrder` path, so the same order priced through either route gets
 * the same execution bound.
 *
 * @param order - Order params carrying the placement type, trigger price, and
 * slippage tolerance.
 * @returns The formatted cap price, or undefined when the order needs no cap.
 */
function resolveTriggerCapPrice(order) {
    if (!(0, orderTypes_js_1.isTriggerOrderType)(order.orderType) ||
        (0, orderTypes_js_1.isLimitExecutionOrderType)(order.orderType) ||
        !order.triggerPrice) {
        return undefined;
    }
    const triggerPrice = parseFloat(order.triggerPrice);
    if (!Number.isFinite(triggerPrice)) {
        return undefined;
    }
    // Accept the deprecated decimal `slippage` too, normalizing it to bps the way
    // `placeOrder` does, so neither spelling silently falls back to the default.
    const effectiveBps = order.maxSlippageBps ??
        (typeof order.slippage === 'number'
            ? Math.round(order.slippage * hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR)
            : undefined) ??
        perpsConfig_js_1.ORDER_SLIPPAGE_CONFIG.DefaultTpslSlippageBps;
    // Buying pays up to the cap, selling accepts down to it.
    const slippage = effectiveBps / hyperLiquidConfig_js_1.BASIS_POINTS_DIVISOR;
    const capPrice = order.isBuy
        ? triggerPrice * (1 + slippage)
        : triggerPrice * (1 - slippage);
    return capPrice.toString();
}
/**
 * Map a placement type onto the SDK's order-type field.
 *
 * @param order - Order params carrying the placement type and trigger price
 * @returns The SDK order-type field
 */
function adaptOrderTypeToSDK(order) {
    if ((0, orderTypes_js_1.isTriggerOrderType)(order.orderType)) {
        if (order.timeInForce !== undefined) {
            throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED);
        }
        if (!order.triggerPrice) {
            throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_TRIGGER_PRICE_REQUIRED);
        }
        return {
            trigger: {
                isMarket: !(0, orderTypes_js_1.isLimitExecutionOrderType)(order.orderType),
                triggerPx: order.triggerPrice,
                tpsl: (0, orderTypes_js_1.getTriggerDirection)(order.orderType) === 'stop' ? 'sl' : 'tp',
            },
        };
    }
    if (order.orderType === 'limit') {
        return { limit: { tif: (0, orderTypes_js_1.toSDKTimeInForce)(order.timeInForce) } };
    }
    if (order.timeInForce !== undefined) {
        throw new Error(perpsErrorCodes_js_1.PERPS_ERROR_CODES.ORDER_TIME_IN_FORCE_NOT_SUPPORTED);
    }
    return { limit: { tif: 'FrontendMarket' } };
}
/**
 * Map the provider-agnostic TP/SL linkage onto HyperLiquid's grouping vocabulary.
 *
 * @param linkage - How the attached TP/SL is linked.
 * @returns The HyperLiquid grouping value.
 */
function adaptTpslLinkageToGrouping(linkage) {
    switch (linkage) {
        case 'position':
            return 'positionTpsl';
        case 'order':
            return 'normalTpsl';
        default:
            return 'na';
    }
}
exports.adaptTpslLinkageToGrouping = adaptTpslLinkageToGrouping;
function adaptPositionFromSDK(assetPosition) {
    const pos = assetPosition.position;
    return {
        symbol: pos.coin,
        size: pos.szi,
        entryPrice: pos.entryPx,
        positionValue: pos.positionValue,
        unrealizedPnl: pos.unrealizedPnl,
        marginUsed: pos.marginUsed,
        leverage: {
            type: pos.leverage.type,
            value: pos.leverage.value,
            rawUsd: pos.leverage.type === 'isolated' ? pos.leverage.rawUsd : undefined,
        },
        liquidationPrice: pos.liquidationPx,
        maxLeverage: pos.maxLeverage,
        returnOnEquity: pos.returnOnEquity,
        cumulativeFunding: pos.cumFunding,
        takeProfitCount: 0,
        stopLossCount: 0,
    };
}
exports.adaptPositionFromSDK = adaptPositionFromSDK;
function adaptOrderFromSDK(rawOrder, position) {
    // TODO: Remove this widened boundary type when FrontendOrder includes
    // takeProfitPrice/stopLossPrice and takeProfitOrderId/stopLossOrderId.
    const parentTpslMetadata = getParentTpslMetadata(rawOrder);
    // Extract basic fields with appropriate conversions
    const orderId = rawOrder.oid.toString();
    const symbol = rawOrder.coin;
    const side = rawOrder.side === 'B' ? 'buy' : 'sell';
    const detailedOrderType = rawOrder.orderType;
    const { isTrigger } = rawOrder;
    const { reduceOnly } = rawOrder;
    const triggerOrderType = adaptTriggerOrderTypeFromSDK(detailedOrderType);
    let orderType = 'market';
    if (triggerOrderType) {
        // Trigger orders always carry a limitPx (the slippage cap for
        // market-on-trigger execution), so the placement type is the only reliable
        // source for how the order actually executes.
        orderType = (0, orderTypes_js_1.getTriggerExecution)(triggerOrderType);
    }
    else if (detailedOrderType.toLowerCase().includes('limit') ||
        rawOrder.limitPx) {
        orderType = 'limit';
    }
    const price = rawOrder.limitPx || rawOrder.triggerPx || '0';
    let size = rawOrder.sz;
    let originalSize = rawOrder.origSz || size;
    let currentSize = parseFloat(size);
    let origSize = parseFloat(originalSize);
    if (rawOrder.isPositionTpsl && origSize === 0 && position) {
        const absPositionSize = Math.abs(parseFloat(position.size));
        currentSize = absPositionSize;
        origSize = absPositionSize;
        size = absPositionSize.toString();
        originalSize = absPositionSize.toString();
    }
    const filledSize = origSize - currentSize;
    let takeProfitPrice;
    let stopLossPrice;
    let takeProfitOrderId;
    let stopLossOrderId;
    // TODO: We assume that there can only be 1 TP and 1 SL as children but there can be several TPSLs as children
    if (rawOrder.children && rawOrder.children.length > 0) {
        rawOrder.children.forEach((child) => {
            if (child.isTrigger && child.orderType) {
                if (child.orderType.includes('Take Profit')) {
                    // HyperLiquid represents "no trigger price" as an empty string, not
                    // null/undefined, so `||` (not `??`) is required to fall back to
                    // limitPx when triggerPx is ''.
                    takeProfitPrice = child.triggerPx || child.limitPx;
                    takeProfitOrderId = child.oid.toString();
                }
                else if (child.orderType.includes('Stop')) {
                    stopLossPrice = child.triggerPx || child.limitPx;
                    stopLossOrderId = child.oid.toString();
                }
            }
        });
    }
    // Fallback: preserve parent-level TP/SL metadata when children are absent.
    takeProfitPrice ?? (takeProfitPrice = parentTpslMetadata.takeProfitPrice);
    stopLossPrice ?? (stopLossPrice = parentTpslMetadata.stopLossPrice);
    takeProfitOrderId ?? (takeProfitOrderId = parentTpslMetadata.takeProfitOrderId);
    stopLossOrderId ?? (stopLossOrderId = parentTpslMetadata.stopLossOrderId);
    // Build the order object
    const order = {
        orderId,
        symbol,
        side,
        orderType,
        size,
        originalSize,
        price,
        filledSize: filledSize.toString(),
        remainingSize: size,
        status: 'open',
        timestamp: rawOrder.timestamp,
        detailedOrderType,
        isTrigger,
        reduceOnly,
    };
    if (typeof rawOrder.isPositionTpsl === 'boolean') {
        order.isPositionTpsl = rawOrder.isPositionTpsl;
    }
    if (takeProfitPrice) {
        order.takeProfitPrice = takeProfitPrice;
        order.takeProfitOrderId = takeProfitOrderId;
    }
    if (stopLossPrice) {
        order.stopLossPrice = stopLossPrice;
        order.stopLossOrderId = stopLossOrderId;
    }
    if (rawOrder.triggerPx) {
        order.triggerPrice = rawOrder.triggerPx;
    }
    if (triggerOrderType) {
        order.triggerOrderType = triggerOrderType;
    }
    return order;
}
exports.adaptOrderFromSDK = adaptOrderFromSDK;
/**
 * Map HyperLiquid's human-readable order type string onto the provider-agnostic
 * trigger placement type.
 *
 * @param detailedOrderType - HyperLiquid `orderType` string (e.g. `'Stop Limit'`)
 * @returns The normalized trigger placement type, or undefined for non-trigger orders
 */
function adaptTriggerOrderTypeFromSDK(detailedOrderType) {
    if (!detailedOrderType) {
        return undefined;
    }
    const isTakeProfit = detailedOrderType.includes('Take Profit');
    const isStop = detailedOrderType.includes('Stop');
    if (!isTakeProfit && !isStop) {
        return undefined;
    }
    return (0, orderTypes_js_1.buildTriggerOrderType)({
        direction: isTakeProfit ? 'take_profit' : 'stop',
        execution: detailedOrderType.includes('Limit') ? 'limit' : 'market',
    });
}
exports.adaptTriggerOrderTypeFromSDK = adaptTriggerOrderTypeFromSDK;
/**
 * Build the position-state view of a trigger order attached to a position.
 *
 * HyperLiquid encodes "the whole position" as size `0` for position-bound TP/SL,
 * which is resolved here against the position size so consumers always see a
 * concrete quantity and can tell partial triggers apart.
 *
 * @param params - Mapping parameters
 * @param params.rawOrder - Raw HyperLiquid frontend order
 * @param params.positionSize - Signed or unsigned position size
 * @param params.entryPrice - Entry price, used to classify a trigger the exchange left unnamed
 * @returns The normalized trigger order, or undefined when the order is not a trigger
 */
function adaptPositionTriggerOrderFromSDK(params) {
    const { rawOrder, positionSize, entryPrice } = params;
    const orderType = adaptTriggerOrderTypeFromSDK(rawOrder.orderType);
    // HyperLiquid uses '' for "no trigger price", so `||` (not `??`) is required.
    const triggerPrice = rawOrder.triggerPx || rawOrder.limitPx || '0';
    // Same rule as the WebSocket path: an unnamed trigger keeps its recoverable
    // direction and leaves its execution mode unstated, so both transports
    // report the same set of orders.
    const direction = orderType
        ? (0, orderTypes_js_1.getTriggerDirection)(orderType)
        : (0, orderTypes_js_1.classifyTriggerDirection)({ triggerPrice, entryPrice, positionSize });
    if (!direction) {
        return undefined;
    }
    const absolutePositionSize = Math.abs(parseFloat(positionSize || '0'));
    const rawSize = Math.abs(parseFloat(rawOrder.sz || '0'));
    // Position-bound TP/SL carries size 0, meaning the whole position.
    const size = rawSize > 0 ? rawSize : absolutePositionSize;
    return {
        orderId: rawOrder.oid.toString(),
        direction,
        orderType,
        triggerPrice,
        size: size.toString(),
        isPartial: rawSize > 0 && absolutePositionSize > 0 && rawSize < absolutePositionSize,
        reduceOnly: Boolean(rawOrder.reduceOnly),
    };
}
exports.adaptPositionTriggerOrderFromSDK = adaptPositionTriggerOrderFromSDK;
function adaptMarketFromSDK(sdkMarket) {
    return {
        name: sdkMarket.name,
        szDecimals: sdkMarket.szDecimals,
        maxLeverage: sdkMarket.maxLeverage,
        marginTableId: sdkMarket.marginTableId,
        onlyIsolated: sdkMarket.onlyIsolated,
        isDelisted: sdkMarket.isDelisted,
    };
}
exports.adaptMarketFromSDK = adaptMarketFromSDK;
// Perps-only account adapter. Spot balances are layered on afterwards by
// addSpotBalanceToAccountState, which enforces the USDC-only policy via
// SPOT_COLLATERAL_COINS. Keeping spot logic out of here preserves a single
// source of truth for spot balance math.
function adaptAccountStateFromSDK(perpsState) {
    const { totalUnrealizedPnl, weightedReturnOnEquity } = perpsState.assetPositions.reduce((acc, assetPos) => {
        const unrealizedPnl = parseFloat(assetPos.position.unrealizedPnl || '0');
        const marginUsed = parseFloat(assetPos.position.marginUsed || '0');
        const returnOnEquity = parseFloat(assetPos.position.returnOnEquity || '0');
        acc.totalUnrealizedPnl += unrealizedPnl;
        acc.weightedReturnOnEquity += returnOnEquity * marginUsed;
        return acc;
    }, {
        totalUnrealizedPnl: 0,
        weightedReturnOnEquity: 0,
    });
    const totalMarginUsed = parseFloat(perpsState.marginSummary.totalMarginUsed || '0');
    const totalReturnOnEquityPercentage = totalMarginUsed > 0
        ? ((weightedReturnOnEquity / totalMarginUsed) * 100).toString()
        : '0';
    const perpsBalance = parseFloat(perpsState.marginSummary.accountValue);
    const withdrawable = perpsState.withdrawable || '0';
    const accountState = {
        spendableBalance: withdrawable,
        withdrawableBalance: withdrawable,
        totalBalance: perpsBalance.toString() || '0',
        marginUsed: perpsState.marginSummary.totalMarginUsed || '0',
        unrealizedPnl: totalUnrealizedPnl.toString() || '0',
        returnOnEquity: totalReturnOnEquityPercentage || '0',
    };
    return accountState;
}
exports.adaptAccountStateFromSDK = adaptAccountStateFromSDK;
function buildAssetMapping(params) {
    const { metaUniverse, perpDexIndex } = params;
    const symbolToAssetId = new Map();
    const assetIdToSymbol = new Map();
    metaUniverse.forEach((asset, index) => {
        const assetId = calculateHip3AssetId(perpDexIndex, index);
        symbolToAssetId.set(asset.name, assetId);
        assetIdToSymbol.set(assetId, asset.name);
    });
    return { symbolToAssetId, assetIdToSymbol };
}
exports.buildAssetMapping = buildAssetMapping;
function formatHyperLiquidPrice(params) {
    const { price, szDecimals } = params;
    const priceNum = typeof price === 'string' ? parseFloat(price) : price;
    if (Number.isInteger(priceNum)) {
        return priceNum.toString();
    }
    const maxDecimalPlaces = perpsConfig_js_1.DECIMAL_PRECISION_CONFIG.MaxPriceDecimals - szDecimals;
    let formattedPrice = priceNum.toFixed(maxDecimalPlaces);
    formattedPrice = parseFloat(formattedPrice).toString();
    const significantDigits = (0, significantFigures_js_1.countSignificantFigures)(formattedPrice);
    if (significantDigits > perpsConfig_js_1.DECIMAL_PRECISION_CONFIG.MaxSignificantFigures) {
        formattedPrice = (0, significantFigures_js_1.roundToSignificantFigures)(formattedPrice);
    }
    return formattedPrice;
}
exports.formatHyperLiquidPrice = formatHyperLiquidPrice;
function formatHyperLiquidSize(params) {
    const { size, szDecimals } = params;
    const number = typeof size === 'string' ? parseFloat(size) : size;
    if (isNaN(number)) {
        return '0';
    }
    const formatted = number.toFixed(szDecimals);
    if (!formatted.includes('.')) {
        return formatted;
    }
    return formatted.replace(/\.?0+$/u, '');
}
exports.formatHyperLiquidSize = formatHyperLiquidSize;
function calculatePositionSize(params) {
    const { usdValue, leverage, assetPrice } = params;
    return (usdValue * leverage) / assetPrice;
}
exports.calculatePositionSize = calculatePositionSize;
function calculateHip3AssetId(perpDexIndex, indexInMeta) {
    if (perpDexIndex === 0) {
        return indexInMeta;
    }
    return (hyperLiquidConfig_js_1.HIP3_ASSET_ID_CONFIG.BaseAssetId +
        perpDexIndex * hyperLiquidConfig_js_1.HIP3_ASSET_ID_CONFIG.DexMultiplier +
        indexInMeta);
}
exports.calculateHip3AssetId = calculateHip3AssetId;
function parseAssetName(assetName) {
    const colonIndex = assetName.indexOf(':');
    if (colonIndex === -1) {
        return { dex: null, symbol: assetName };
    }
    return {
        dex: assetName.substring(0, colonIndex),
        symbol: assetName.substring(colonIndex + 1),
    };
}
exports.parseAssetName = parseAssetName;
function adaptHyperLiquidLedgerUpdateToUserHistoryItem(rawLedgerUpdates) {
    return (rawLedgerUpdates || [])
        .filter((update) => {
        if (update.delta.type === 'deposit') {
            return true;
        }
        if (update.delta.type === 'withdraw') {
            return true;
        }
        if (update.delta.type === 'internalTransfer') {
            const usdc = Number.parseFloat(update.delta.usdc ?? '0');
            if (Number.isNaN(usdc)) {
                return false;
            }
            return usdc > 0;
        }
        return false;
    })
        .map((update) => {
        let amount = '0';
        let asset = 'USDC';
        if ((0, utils_1.hasProperty)(update.delta, 'usdc') && update.delta.usdc) {
            amount = Math.abs(parseFloat(update.delta.usdc)).toString();
        }
        if ((0, utils_1.hasProperty)(update.delta, 'coin') &&
            typeof update.delta.coin === 'string') {
            asset = update.delta.coin;
        }
        return {
            id: `history-${update.hash}`,
            timestamp: update.time,
            amount,
            asset,
            txHash: update.hash,
            status: 'completed',
            type: update.delta.type === 'withdraw' ? 'withdrawal' : 'deposit',
            details: {
                source: '',
                bridgeContract: undefined,
                recipient: undefined,
                blockNumber: undefined,
                chainId: undefined,
                synthetic: undefined,
            },
        };
    });
}
exports.adaptHyperLiquidLedgerUpdateToUserHistoryItem = adaptHyperLiquidLedgerUpdateToUserHistoryItem;
//# sourceMappingURL=hyperLiquidAdapter.cjs.map