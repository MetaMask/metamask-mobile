"use strict";
/**
 * MYX SDK Adapter Utilities
 *
 * Adapters for transforming between MetaMask Perps API types and MYX SDK types.
 * Includes adapters for market display, positions, orders, account state, and fills.
 *
 * Portable: no mobile-specific imports.
 * Formatters are injected via MarketDataFormatters interface (same pattern as marketDataTransform.ts).
 *
 * Key differences from HyperLiquid:
 * - API prices are normal floats (SDK contract layer uses 30 decimals internally)
 * - Sizes use 18 decimals (vs HyperLiquid's szDecimals per asset)
 * - Multiple pools can exist per symbol (MPM model)
 * - USDT collateral (vs USDC)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertMYXSuccess = exports.toMYXKlineResolution = exports.adaptCandleFromMYXWebSocket = exports.adaptCandleFromMYX = exports.adaptUserHistoryFromMYX = exports.adaptFundingFromMYX = exports.adaptOrderFillFromMYX = exports.adaptAccountStateFromMYX = exports.adaptOrderFromMYX = exports.adaptPositionFromMYX = exports.extractSymbolFromPoolId = exports.buildSymbolPoolsMap = exports.buildPoolSymbolMap = exports.isOverlappingMarket = exports.filterMYXExclusiveMarkets = exports.adaptMarketDataFromMYX = exports.adaptPriceFromMYX = exports.adaptMarketFromMYX = void 0;
const myxConfig_js_1 = require("../constants/myxConfig.cjs");
const myx_types_js_1 = require("../types/myx-types.cjs");
/**
 * Format a price change value with sign prefix.
 * Uses injected formatters (same pattern as marketDataTransform.ts formatChange).
 *
 * @param change - The price change value to format.
 * @param formatters - Injectable formatters for platform-agnostic formatting.
 * @returns The formatted change string with sign and dollar symbol.
 */
function formatChange(change, formatters) {
    if (isNaN(change) || !isFinite(change)) {
        return '$0.00';
    }
    if (change === 0) {
        return '$0.00';
    }
    const formatted = formatters.formatPerpsFiat(Math.abs(change), {
        ranges: formatters.priceRangesUniversal,
    });
    const valueWithoutDollar = formatted.replace('$', '');
    return change > 0 ? `+$${valueWithoutDollar}` : `-$${valueWithoutDollar}`;
}
// ============================================================================
// Market Transformation
// ============================================================================
/**
 * Transform MYX Pool/Market info to MetaMask Perps API MarketInfo format
 *
 * @param pool - Pool symbol data from MYX SDK (PoolSymbolAllResponse)
 * @returns MetaMask Perps API market info object
 */
function adaptMarketFromMYX(pool) {
    // Extract base symbol from pool data
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    // MYX uses fixed 18 decimals for sizes
    const szDecimals = 18;
    return {
        name: symbol,
        szDecimals,
        maxLeverage: myxConfig_js_1.MYX_MAX_LEVERAGE,
        marginTableId: 0, // MYX doesn't use margin tables like HyperLiquid
        minimumOrderSize: myxConfig_js_1.MYX_MINIMUM_ORDER_SIZE_USD,
        providerId: 'myx',
    };
}
exports.adaptMarketFromMYX = adaptMarketFromMYX;
/**
 * Convert MYX ticker data to price and change values
 *
 * @param ticker - Ticker data from MYX SDK
 * @returns Object with price string and 24h change percentage
 */
function adaptPriceFromMYX(ticker) {
    // MYX API returns normal float strings (e.g. "64854.76")
    const priceNum = (0, myxConfig_js_1.fromMYXPrice)(ticker.price);
    // Change is provided as a percentage string (e.g., "2.5" means 2.5%)
    const change24h = ticker.change ? parseFloat(ticker.change) : 0;
    return {
        price: priceNum.toString(),
        change24h,
    };
}
exports.adaptPriceFromMYX = adaptPriceFromMYX;
/**
 * Transform MYX pool and ticker to PerpsMarketData for UI display
 *
 * @param pool - Pool symbol data from MYX SDK
 * @param ticker - Optional ticker data for price info
 * @param formatters - Injectable formatters for platform-agnostic formatting
 * @returns Formatted market data for UI display
 */
function adaptMarketDataFromMYX(pool, ticker, formatters) {
    const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
    // Get price data from ticker if available
    let price = '0';
    let change24h = 0;
    let volume = '0';
    if (ticker) {
        const priceData = adaptPriceFromMYX(ticker);
        price = priceData.price;
        change24h = priceData.change24h;
        // Volume is already in USD (not 30-decimal format)
        volume = ticker.volume || '0';
    }
    // Format using injected formatters (consistent with HyperLiquid via marketDataTransform.ts)
    const priceNum = parseFloat(price);
    const formattedPrice = formatters.formatPerpsFiat(priceNum);
    const priceChange = priceNum * (change24h / 100);
    const formattedChange = formatChange(priceChange, formatters);
    const formattedChangePercent = formatters.formatPercentage(change24h);
    const formattedVolume = formatters.formatVolume(parseFloat(volume));
    return {
        symbol,
        name: getTokenName(symbol),
        maxLeverage: `${myxConfig_js_1.MYX_MAX_LEVERAGE}x`,
        price: formattedPrice,
        change24h: formattedChange,
        change24hPercent: formattedChangePercent,
        volume: formattedVolume,
        providerId: 'myx',
    };
}
exports.adaptMarketDataFromMYX = adaptMarketDataFromMYX;
// ============================================================================
// Market Filtering
// ============================================================================
/**
 * Filter MYX markets to only include MYX-exclusive markets
 * Removes markets that overlap with HyperLiquid
 *
 * @param pools - Array of MYX pool symbols
 * @returns Filtered array with only MYX-exclusive markets
 */
function filterMYXExclusiveMarkets(pools) {
    return pools.filter((pool) => {
        const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
        // Exclude markets that overlap with HyperLiquid
        return !myx_types_js_1.MYX_HL_OVERLAPPING_MARKETS.includes(symbol);
    });
}
exports.filterMYXExclusiveMarkets = filterMYXExclusiveMarkets;
/**
 * Check if a symbol overlaps with HyperLiquid markets
 *
 * @param symbol - Market symbol to check
 * @returns true if the symbol is available on both MYX and HyperLiquid
 */
function isOverlappingMarket(symbol) {
    return myx_types_js_1.MYX_HL_OVERLAPPING_MARKETS.includes(symbol);
}
exports.isOverlappingMarket = isOverlappingMarket;
// ============================================================================
// Pool ID Utilities
// ============================================================================
/**
 * Build a map of poolId to symbol for quick lookup
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of poolId to symbol
 */
function buildPoolSymbolMap(pools) {
    const map = new Map();
    for (const pool of pools) {
        const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
        map.set(pool.poolId, symbol);
    }
    return map;
}
exports.buildPoolSymbolMap = buildPoolSymbolMap;
/**
 * Build a map of symbol to poolIds (for multi-pool support)
 *
 * @param pools - Array of MYX pool symbols
 * @returns Map of symbol to array of poolIds
 */
function buildSymbolPoolsMap(pools) {
    const map = new Map();
    for (const pool of pools) {
        const symbol = pool.baseSymbol || extractSymbolFromPoolId(pool.poolId);
        const existing = map.get(symbol) ?? [];
        existing.push(pool.poolId);
        map.set(symbol, existing);
    }
    return map;
}
exports.buildSymbolPoolsMap = buildSymbolPoolsMap;
/**
 * Extract symbol from pool ID
 * Pool IDs typically contain the symbol as a suffix or can be parsed.
 * When baseSymbol is unavailable, returns a truncated address for UI display.
 *
 * @param poolId - MYX pool ID string
 * @returns Extracted symbol or truncated poolId as fallback
 */
function extractSymbolFromPoolId(poolId) {
    // Pool IDs in MYX are hex addresses ("0x...")
    // The actual symbol comes from the pool's baseSymbol field
    // Truncate hex addresses so they're UI-friendly
    if (poolId.startsWith('0x') && poolId.length > 10) {
        return `${poolId.slice(0, 6)}...${poolId.slice(-4)}`;
    }
    return poolId;
}
exports.extractSymbolFromPoolId = extractSymbolFromPoolId;
/**
 * Get full token name from symbol
 * Returns the symbol as name if not found (MYX-specific tokens)
 *
 * @param symbol - The market symbol to look up.
 * @returns The human-readable token name, or the symbol itself if not found.
 */
function getTokenName(symbol) {
    const tokenNames = {
        BTC: 'Bitcoin',
        ETH: 'Ethereum',
        BNB: 'BNB',
        MYX: 'MYX Protocol',
        RHEA: 'Rhea Finance',
        PARTI: 'Particle Network',
        SKYAI: 'SkyAI',
        PUMP: 'PumpFun',
        WLFI: 'World Liberty Financial',
    };
    return tokenNames[symbol] || symbol;
}
// ============================================================================
// Position Adapter
// ============================================================================
/**
 * Adapt MYX SDK PositionType to MetaMask Position
 *
 * @param pos - MYX position from SDK
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Position object
 */
function adaptPositionFromMYX(pos, poolSymbolMap) {
    const symbol = poolSymbolMap.get(pos.poolId) ?? pos.poolId;
    const sizeNum = (0, myxConfig_js_1.fromMYXSize)(pos.size);
    const entryPriceNum = (0, myxConfig_js_1.fromMYXPrice)(pos.entryPrice);
    const collateralNum = (0, myxConfig_js_1.fromMYXCollateral)(pos.collateralAmount);
    // Direction: 0 = LONG (positive size), 1 = SHORT (negative size)
    const isLong = pos.direction === myx_types_js_1.MYXDirection.LONG;
    const signedSize = isLong ? sizeNum : -sizeNum;
    // Position value = size * entry price
    const positionValue = Math.abs(sizeNum * entryPriceNum);
    // Leverage = position value / collateral (approximate)
    const leverage = collateralNum > 0 ? positionValue / collateralNum : 1;
    return {
        symbol,
        size: signedSize.toString(),
        entryPrice: entryPriceNum.toString(),
        positionValue: positionValue.toString(),
        unrealizedPnl: '0', // Requires mark price - will be enriched by WS or separate call
        marginUsed: collateralNum.toString(),
        leverage: {
            type: 'isolated',
            value: Math.round(leverage),
            rawUsd: collateralNum.toString(),
        },
        liquidationPrice: null, // Requires separate calculation
        maxLeverage: myxConfig_js_1.MYX_MAX_LEVERAGE,
        returnOnEquity: '0',
        cumulativeFunding: {
            allTime: '0',
            sinceOpen: '0',
            sinceChange: '0',
        },
        takeProfitPrice: undefined,
        stopLossPrice: undefined,
        takeProfitCount: 0,
        stopLossCount: 0,
        providerId: 'myx',
    };
}
exports.adaptPositionFromMYX = adaptPositionFromMYX;
// ============================================================================
// Order Adapter
// ============================================================================
/**
 * Adapt MYX SDK open order (PositionType-shaped from getOrders) to MetaMask Order.
 * Note: getOrders returns PositionType[] per the SDK types.
 * For richer order data, use getOrderHistory.
 *
 * @param historyOrder - MYX history order item
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask Order object
 */
function adaptOrderFromMYX(historyOrder, poolSymbolMap) {
    const symbol = historyOrder.baseSymbol ??
        poolSymbolMap.get(historyOrder.poolId) ??
        historyOrder.poolId;
    const priceNum = (0, myxConfig_js_1.fromMYXPrice)(historyOrder.price);
    const sizeNum = (0, myxConfig_js_1.fromMYXSize)(historyOrder.size);
    const filledSizeNum = (0, myxConfig_js_1.fromMYXSize)(historyOrder.filledSize);
    const remainingSize = Math.max(0, sizeNum - filledSizeNum);
    // Map direction
    const side = historyOrder.direction === myx_types_js_1.MYXDirectionEnum.Long ? 'buy' : 'sell';
    // Map order type
    let orderType = 'market';
    if (historyOrder.orderType === myx_types_js_1.MYXOrderTypeEnum.Limit) {
        orderType = 'limit';
    }
    // Map status
    let status = 'open';
    switch (historyOrder.orderStatus) {
        case myx_types_js_1.MYXOrderStatusEnum.Successful:
            status = 'filled';
            break;
        case myx_types_js_1.MYXOrderStatusEnum.Cancelled:
            status = 'canceled';
            break;
        case myx_types_js_1.MYXOrderStatusEnum.Expired:
            status = 'canceled';
            break;
        default:
            status = 'open';
    }
    // Detect trigger orders
    const isTrigger = historyOrder.execType === myx_types_js_1.MYXExecTypeEnum.TP ||
        historyOrder.execType === myx_types_js_1.MYXExecTypeEnum.SL;
    let detailedOrderType;
    if (historyOrder.execType === myx_types_js_1.MYXExecTypeEnum.TP) {
        detailedOrderType = 'Take Profit';
    }
    else if (historyOrder.execType === myx_types_js_1.MYXExecTypeEnum.SL) {
        detailedOrderType = 'Stop Loss';
    }
    else if (historyOrder.execType === myx_types_js_1.MYXExecTypeEnum.Liquidation) {
        detailedOrderType = 'Liquidation';
    }
    return {
        orderId: String(historyOrder.orderId),
        symbol,
        side,
        orderType,
        size: sizeNum.toString(),
        originalSize: sizeNum.toString(),
        price: priceNum.toString(),
        filledSize: filledSizeNum.toString(),
        remainingSize: remainingSize.toString(),
        status,
        timestamp: historyOrder.txTime,
        isTrigger,
        detailedOrderType,
        reduceOnly: historyOrder.operation === myx_types_js_1.MYXOperationEnum.Decrease ? true : undefined,
        providerId: 'myx',
    };
}
exports.adaptOrderFromMYX = adaptOrderFromMYX;
// ============================================================================
// Account State Adapter
// ============================================================================
/**
 * Adapt MYX account info response to MetaMask AccountState.
 *
 * @param accountInfo - Raw account info from MYX SDK
 * @param walletBalance - Wallet USDT balance (from getWalletQuoteTokenBalance)
 * @returns MetaMask AccountState
 */
function adaptAccountStateFromMYX(accountInfo, walletBalance) {
    // accountInfo structure varies; extract what we can
    // TODO: Verify SDK semantics — if totalCollateral already includes unrealizedPnl,
    // the totalBalance formula below double-counts. Needs SDK documentation check.
    const rawCollateral = accountInfo?.totalCollateral ?? '0';
    const rawPnl = accountInfo?.unrealizedPnl ?? '0';
    const marginUsed = accountInfo ? (0, myxConfig_js_1.fromMYXCollateral)(String(rawCollateral)) : 0;
    const unrealizedPnl = accountInfo ? (0, myxConfig_js_1.fromMYXCollateral)(String(rawPnl)) : 0;
    const balance = walletBalance ? (0, myxConfig_js_1.fromMYXCollateral)(walletBalance) : 0;
    const totalBalance = balance + marginUsed + unrealizedPnl;
    return {
        spendableBalance: balance.toString(),
        withdrawableBalance: balance.toString(),
        totalBalance: totalBalance.toString(),
        marginUsed: marginUsed.toString(),
        unrealizedPnl: unrealizedPnl.toString(),
        returnOnEquity: '0',
    };
}
exports.adaptAccountStateFromMYX = adaptAccountStateFromMYX;
// ============================================================================
// Order Fill Adapter
// ============================================================================
/**
 * Adapt MYX history order item (filled) to MetaMask OrderFill
 *
 * @param order - MYX history order item
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns MetaMask OrderFill
 */
function adaptOrderFillFromMYX(order, poolSymbolMap) {
    const symbol = order.baseSymbol ?? poolSymbolMap.get(order.poolId) ?? order.poolId;
    const sizeNum = (0, myxConfig_js_1.fromMYXSize)(order.filledSize || order.size);
    const priceNum = (0, myxConfig_js_1.fromMYXPrice)(order.lastPrice || order.price);
    const side = order.direction === myx_types_js_1.MYXDirectionEnum.Long ? 'buy' : 'sell';
    const feeNum = (0, myxConfig_js_1.fromMYXCollateral)(order.tradingFee || '0');
    const pnlNum = (0, myxConfig_js_1.fromMYXCollateral)(order.realizedPnl || '0');
    let orderType = 'regular';
    if (order.execType === myx_types_js_1.MYXExecTypeEnum.TP) {
        orderType = 'take_profit';
    }
    else if (order.execType === myx_types_js_1.MYXExecTypeEnum.SL) {
        orderType = 'stop_loss';
    }
    else if (order.execType === myx_types_js_1.MYXExecTypeEnum.Liquidation) {
        orderType = 'liquidation';
    }
    return {
        orderId: String(order.orderId),
        symbol,
        side,
        size: sizeNum.toString(),
        price: priceNum.toString(),
        pnl: pnlNum.toString(),
        direction: side,
        fee: feeNum.toString(),
        feeToken: 'USDT',
        timestamp: order.txTime,
        success: order.orderStatus === myx_types_js_1.MYXOrderStatusEnum.Successful,
        orderType,
        providerId: 'myx',
    };
}
exports.adaptOrderFillFromMYX = adaptOrderFillFromMYX;
// ============================================================================
// Funding Adapter
// ============================================================================
/**
 * Adapt MYX trade flow items (funding type) to MetaMask Funding
 *
 * @param flows - MYX trade flow items filtered to funding type
 * @param poolSymbolMap - Map of poolId to symbol
 * @returns Array of MetaMask Funding objects
 */
function adaptFundingFromMYX(flows, poolSymbolMap) {
    return flows
        .filter((flow) => flow.fundingFee && flow.fundingFee !== '0' && flow.fundingFee !== '')
        .map((flow) => {
        const symbol = poolSymbolMap.get(flow.poolId) ?? flow.poolId;
        const amountUsd = (0, myxConfig_js_1.fromMYXCollateral)(flow.fundingFee);
        return {
            symbol,
            amountUsd: amountUsd.toString(),
            rate: undefined, // Funding rate not available in MYX trade flow data
            timestamp: flow.txTime,
            transactionHash: flow.txHash,
        };
    });
}
exports.adaptFundingFromMYX = adaptFundingFromMYX;
// ============================================================================
// User History Adapter
// ============================================================================
/**
 * Adapt MYX trade flow items to MetaMask UserHistoryItem
 *
 * @param flows - MYX trade flow items
 * @returns Array of UserHistoryItem
 */
function adaptUserHistoryFromMYX(flows) {
    return flows
        .filter((flow) => flow.type === myx_types_js_1.MYXTradeFlowTypeEnum.MarginAccountDeposit ||
        flow.type === myx_types_js_1.MYXTradeFlowTypeEnum.TransferToWallet)
        .map((flow) => {
        const isDeposit = flow.type === myx_types_js_1.MYXTradeFlowTypeEnum.MarginAccountDeposit;
        const amount = (0, myxConfig_js_1.fromMYXCollateral)(flow.collateralAmount || '0');
        return {
            id: String(flow.orderId),
            timestamp: flow.txTime,
            type: isDeposit ? 'deposit' : 'withdrawal',
            amount: Math.abs(amount).toString(),
            asset: 'USDT',
            txHash: flow.txHash,
            status: 'completed',
            details: {
                source: 'myx',
            },
        };
    });
}
exports.adaptUserHistoryFromMYX = adaptUserHistoryFromMYX;
// ============================================================================
// Candle (Kline) Adapter
// ============================================================================
/**
 * Adapt MYX KlineDataItemType to MetaMask CandleStick.
 * KlineDataItemType fields (time, open, close, high, low) are already
 * human-readable strings — no 30-decimal conversion needed.
 *
 * @param item - MYX kline data item from SDK
 * @returns MetaMask CandleStick object
 */
function adaptCandleFromMYX(item) {
    return {
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: '0', // KlineDataItemType has no volume field
    };
}
exports.adaptCandleFromMYX = adaptCandleFromMYX;
/**
 * Adapt MYX WebSocket KlineData to MetaMask CandleStick.
 * WS KlineData uses single-letter fields: {t, o, h, l, c, v}.
 *
 * @param data - MYX WebSocket kline data
 * @returns MetaMask CandleStick object
 */
function adaptCandleFromMYXWebSocket(data) {
    return {
        time: data.t,
        open: data.o,
        high: data.h,
        low: data.l,
        close: data.c,
        volume: data.v,
    };
}
exports.adaptCandleFromMYXWebSocket = adaptCandleFromMYXWebSocket;
/**
 * Map CandlePeriod values to MYX KlineResolution.
 * MYX SDK supports: '1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w', '1M'.
 * Unsupported CandlePeriod values are mapped to the nearest supported resolution.
 */
const CANDLE_PERIOD_TO_MYX_RESOLUTION = {
    '1m': '1m',
    '3m': '5m', // No 3m → use 5m
    '5m': '5m',
    '15m': '15m',
    '30m': '30m',
    '1h': '1h',
    '2h': '4h', // No 2h → use 4h
    '4h': '4h',
    '8h': '4h', // No 8h → use 4h
    '12h': '1d', // No 12h → use 1d
    '1d': '1d',
    '3d': '1w', // No 3d → use 1w
    '1w': '1w',
    '1M': '1M',
};
/**
 * Convert a CandlePeriod string to MYX KlineResolution.
 *
 * @param period - CandlePeriod value (e.g., '1m', '3m', '1h')
 * @returns MYX KlineResolution string
 */
function toMYXKlineResolution(period) {
    return CANDLE_PERIOD_TO_MYX_RESOLUTION[period] ?? '1h';
}
exports.toMYXKlineResolution = toMYXKlineResolution;
// ============================================================================
// Response Validation
// ============================================================================
/**
 * Assert MYX API response is successful.
 * MYX uses code 9200 or 0 for success.
 *
 * @param response - MYX API response with code field
 * @param response.code - Response code (9200 or 0 = success)
 * @param response.message - Optional error message
 * @param context - Context string for error messages
 */
function assertMYXSuccess(response, context) {
    if (response.code !== 9200 && response.code !== 0) {
        throw new Error(`MYX ${context} failed: code=${response.code} message=${response.message ?? 'unknown'}`);
    }
}
exports.assertMYXSuccess = assertMYXSuccess;
//# sourceMappingURL=myxAdapter.cjs.map