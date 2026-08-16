"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatChange = exports.transformMarketData = exports.isMarketTradable = exports.calculateOpenInterestUSD = void 0;
/**
 * Market data transformation utilities.
 *
 * Portable: no mobile-specific imports.
 * Formatters are injected via MarketDataFormatters interface.
 */
const utils_1 = require("@metamask/utils");
const hyperLiquidConfig_js_1 = require("../constants/hyperLiquidConfig.cjs");
const perpsConfig_js_1 = require("../constants/perpsConfig.cjs");
const hyperLiquidAdapter_js_1 = require("./hyperLiquidAdapter.cjs");
/**
 * Calculate open interest in USD
 * Open interest from HyperLiquid is in contracts/units, not USD
 * To get USD value, multiply by current price
 *
 * @param openInterest - Raw open interest value in contracts/units
 * @param currentPrice - Current price of the asset
 * @returns Open interest in USD, or NaN if invalid
 */
function calculateOpenInterestUSD(openInterest, currentPrice) {
    if (openInterest === undefined || currentPrice === undefined) {
        return NaN;
    }
    const openInterestNum = typeof openInterest === 'string' ? parseFloat(openInterest) : openInterest;
    const priceNum = typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;
    if (isNaN(openInterestNum) || isNaN(priceNum)) {
        return NaN;
    }
    return openInterestNum * priceNum;
}
exports.calculateOpenInterestUSD = calculateOpenInterestUSD;
/**
 * Determine whether a market is currently tradable based on how far its market
 * (mid) price has drifted from the oracle (reference) price.
 *
 * HyperLiquid rejects orders when the order price is more than 95% away from the
 * reference price ("Order price cannot be more than 95% away from the reference
 * price"). This most often affects HIP-3 builder-deployed markets, which can become
 * temporarily untradable when their mid price diverges far from the oracle price.
 * Clients use this signal to proactively warn the user (e.g. a "trading unavailable"
 * banner) instead of letting the order fail on submission.
 *
 * Note: the deviation limit is a HyperLiquid protocol rule. Other providers may have
 * different rules and should compute tradability accordingly.
 *
 * @param params - The parameters for the tradability check.
 * @param params.midPrice - Current market/mid price.
 * @param params.oraclePrice - Current oracle/reference price.
 * @param params.deviationLimit - Max allowed deviation as a decimal fraction
 * (defaults to HyperLiquid's 0.95). A market is untradable when
 * `abs(midPrice - oraclePrice) / oraclePrice > deviationLimit`.
 * @returns `true` when the market is tradable (or when prices are unavailable, so the
 * absence of data never blocks trading); `false` when the deviation exceeds the limit.
 */
function isMarketTradable(params) {
    const { midPrice, oraclePrice, deviationLimit = hyperLiquidConfig_js_1.HYPERLIQUID_CONFIG.OraclePriceDeviationLimit, } = params;
    // Without usable prices we cannot assess deviation — default to tradable so missing
    // data never blocks the user. A non-positive price means "no data" (e.g. the transient
    // zero price emitted before the first real tick), not an untradable market.
    if (midPrice === undefined ||
        oraclePrice === undefined ||
        isNaN(midPrice) ||
        isNaN(oraclePrice) ||
        midPrice <= 0 ||
        oraclePrice <= 0) {
        return true;
    }
    const deviation = Math.abs(midPrice - oraclePrice) / oraclePrice;
    return deviation <= deviationLimit;
}
exports.isMarketTradable = isMarketTradable;
/**
 * Calculate 24h percentage change
 * Shows -100% when current price is missing but previous price exists
 *
 * @param params - The parameters for calculating the 24h change.
 * @returns The 24h percentage change value.
 */
function calculateChange24hPercent(params) {
    const { hasCurrentPrice, currentPrice, prevDayPrice } = params;
    if (!hasCurrentPrice) {
        return prevDayPrice > 0 ? -100 : 0;
    }
    if (prevDayPrice <= 0) {
        return 0;
    }
    return ((currentPrice - prevDayPrice) / prevDayPrice) * 100;
}
/**
 * Extract funding data for a symbol from predicted fundings.
 * Looks for specified exchange first, falls back to first available.
 *
 * @param params - Parameters for extracting funding data
 * @param params.predictedFundings - Array of predicted funding data
 * @param params.symbol - Asset symbol to extract funding for
 * @param params.exchangeName - Exchange to prioritize (defaults to HyperLiquid's 'HlPerp')
 * @returns Funding data including next funding time, interval, and predicted rate
 */
function extractFundingData(params) {
    const { predictedFundings, symbol, exchangeName = hyperLiquidConfig_js_1.HYPERLIQUID_CONFIG.ExchangeName, } = params;
    const result = {};
    if (!predictedFundings) {
        return result;
    }
    const fundingData = predictedFundings.find(([assetSymbol]) => assetSymbol === symbol);
    if (!fundingData?.[1] ||
        !Array.isArray(fundingData[1]) ||
        fundingData[1].length === 0) {
        return result;
    }
    // Look for specified exchange (e.g., 'HlPerp' for HyperLiquid)
    const targetExchange = fundingData[1].find((exchange) => Array.isArray(exchange) && exchange[0] === exchangeName);
    if (targetExchange?.[1]) {
        result.nextFundingTime = targetExchange[1].nextFundingTime;
        result.fundingIntervalHours = targetExchange[1].fundingIntervalHours;
        result.predictedFundingRate = parseFloat(targetExchange[1].fundingRate);
        return result;
    }
    // Fallback to first exchange if target not found
    const firstExchange = fundingData[1][0];
    if (Array.isArray(firstExchange) && firstExchange[1]) {
        result.nextFundingTime = firstExchange[1].nextFundingTime;
        result.fundingIntervalHours = firstExchange[1].fundingIntervalHours;
    }
    return result;
}
/**
 * Transform raw HyperLiquid market data to UI-friendly format
 *
 * @param hyperLiquidData - Raw data from HyperLiquid API
 * @param formatters - Injectable formatters for platform-agnostic formatting
 * @param assetMarketTypes - Optional mapping of asset symbols to market types
 * @param assetNames - Optional mapping of asset symbols to human-readable names.
 * Defaults to the bundled HYPERLIQUID_ASSET_NAMES; unmapped assets fall back to
 * their ticker symbol.
 * @returns Transformed market data ready for UI consumption
 */
function transformMarketData(hyperLiquidData, formatters, assetMarketTypes, assetNames) {
    const { universe, assetCtxs, allMids, predictedFundings } = hyperLiquidData;
    return universe.map((asset, index) => {
        const symbol = asset.name;
        const currentPrice = parseFloat(allMids[symbol]);
        // Find matching asset context for additional data
        // The assetCtxs array is aligned with universe array by index
        const assetCtx = assetCtxs[index];
        // Calculate 24h change
        const prevDayPrice = assetCtx ? parseFloat(assetCtx.prevDayPx) : 0;
        // Handle missing current price data
        const hasCurrentPrice = !isNaN(currentPrice);
        const effectiveCurrentPrice = hasCurrentPrice ? currentPrice : 0;
        // For dollar change: show $0.00 when current price is missing
        const change24h = hasCurrentPrice
            ? effectiveCurrentPrice - prevDayPrice
            : 0;
        // For percentage: show -100% when current price is missing but previous price exists
        const change24hPercent = calculateChange24hPercent({
            hasCurrentPrice,
            currentPrice: effectiveCurrentPrice,
            prevDayPrice,
        });
        // Format volume (dayNtlVlm is daily notional volume)
        // If assetCtx is missing or dayNtlVlm is not available, use NaN to indicate missing data
        const volume = assetCtx?.dayNtlVlm ? parseFloat(assetCtx.dayNtlVlm) : NaN;
        // Calculate open interest in USD
        const openInterest = calculateOpenInterestUSD(assetCtx?.openInterest, currentPrice);
        // Get current funding rate from assetCtx - this is the actual current funding rate
        let fundingRate;
        if (assetCtx && (0, utils_1.hasProperty)(assetCtx, 'funding')) {
            fundingRate = parseFloat(assetCtx.funding);
        }
        // Extract funding timing and predicted rate
        const fundingData = extractFundingData({
            predictedFundings,
            symbol,
        });
        // Use current funding rate from assetCtx, not predicted
        // The predicted rate is for the next funding period
        if (!fundingRate && fundingData.predictedFundingRate !== undefined) {
            fundingRate = fundingData.predictedFundingRate;
        }
        // Extract DEX and base symbol for display
        // e.g., "flx:TSLA" → { dex: "flx", symbol: "TSLA" }
        const { dex } = (0, hyperLiquidAdapter_js_1.parseAssetName)(symbol);
        const marketSource = dex ?? undefined;
        // HIP-3 markets have a DEX prefix (e.g., xyz:TSLA, flx:GOLD)
        // Crypto markets (HIP-2) don't have a prefix (e.g., BTC, ETH)
        const isHip3 = Boolean(dex);
        // Determine market type from explicit static mapping
        const marketType = assetMarketTypes?.[symbol];
        // Mark as "new" if it's a HIP-3 market but not explicitly categorized
        const isNewMarket = isHip3 && !marketType;
        return {
            symbol,
            name: (0, hyperLiquidConfig_js_1.getHyperLiquidAssetName)(symbol, assetNames),
            maxLeverage: `${asset.maxLeverage}x`,
            price: isNaN(currentPrice)
                ? perpsConfig_js_1.PERPS_CONSTANTS.FallbackPriceDisplay
                : formatters.formatPerpsFiat(currentPrice, {
                    ranges: formatters.priceRangesUniversal,
                }),
            change24h: isNaN(change24h)
                ? perpsConfig_js_1.PERPS_CONSTANTS.ZeroAmountDetailedDisplay
                : formatChange(change24h, formatters),
            change24hPercent: isNaN(change24hPercent)
                ? '0.00%'
                : formatters.formatPercentage(change24hPercent),
            volume: isNaN(volume)
                ? perpsConfig_js_1.PERPS_CONSTANTS.FallbackPriceDisplay
                : formatters.formatVolume(volume),
            openInterest: isNaN(openInterest)
                ? perpsConfig_js_1.PERPS_CONSTANTS.FallbackPriceDisplay
                : formatters.formatVolume(openInterest),
            nextFundingTime: fundingData.nextFundingTime,
            fundingIntervalHours: fundingData.fundingIntervalHours,
            fundingRate,
            marketSource,
            marketType,
            isHip3,
            isNewMarket,
        };
    });
}
exports.transformMarketData = transformMarketData;
/**
 * Format 24h change with sign.
 * Uses more decimal places for smaller amounts to show meaningful precision.
 *
 * @param change - The price change value to format
 * @param formatters - Injectable formatters
 * @returns Formatted change string with sign and dollar symbol
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
    // Remove $ sign and add it back with proper sign placement
    const valueWithoutDollar = formatted.replace('$', '');
    return change > 0 ? `+$${valueWithoutDollar}` : `-$${valueWithoutDollar}`;
}
exports.formatChange = formatChange;
//# sourceMappingURL=marketDataTransform.cjs.map