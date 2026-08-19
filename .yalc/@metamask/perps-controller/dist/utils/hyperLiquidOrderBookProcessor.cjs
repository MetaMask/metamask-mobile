"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processBboData = exports.processL2BookData = void 0;
/**
 * Process Level 2 order book data and update caches
 *
 * Extracts best bid/ask prices from order book levels, calculates spread,
 * and updates the order book cache and price data cache.
 *
 * @param params - Processing parameters
 */
function processL2BookData(params) {
    const { symbol, data, orderBookCache, cachedPriceData, createPriceUpdate, notifySubscribers, } = params;
    if (data?.coin !== symbol || !data?.levels) {
        return;
    }
    // Extract best bid and ask from order book
    const bestBid = data.levels[0]?.[0]; // First bid level
    const bestAsk = data.levels[1]?.[0]; // First ask level
    if (!bestBid && !bestAsk) {
        return;
    }
    const bidPrice = bestBid ? parseFloat(bestBid.px) : 0;
    const askPrice = bestAsk ? parseFloat(bestAsk.px) : 0;
    const spread = bidPrice > 0 && askPrice > 0 ? (askPrice - bidPrice).toFixed(5) : undefined;
    // Update order book cache
    orderBookCache.set(symbol, {
        bestBid: bestBid?.px,
        bestAsk: bestAsk?.px,
        spread,
        lastUpdated: Date.now(),
    });
    // Update cached price data with new order book data
    const currentCachedPrice = cachedPriceData?.get(symbol);
    if (!currentCachedPrice) {
        return;
    }
    const updatedPrice = createPriceUpdate(symbol, currentCachedPrice.price);
    // Ensure cache exists before setting
    if (cachedPriceData) {
        cachedPriceData.set(symbol, updatedPrice);
        notifySubscribers();
    }
}
exports.processL2BookData = processL2BookData;
/**
 * Process BBO (best bid/offer) data and update caches
 *
 * BBO is lightweight and independent from L2Book aggregation parameters,
 * making it ideal for spread / top-of-book display.
 *
 * @param params - The BBO processing parameters including symbol, data, and caches.
 */
function processBboData(params) {
    const { symbol, data, orderBookCache, cachedPriceData, createPriceUpdate, notifySubscribers, } = params;
    if (data?.coin !== symbol || !Array.isArray(data?.bbo)) {
        return;
    }
    const [bestBid, bestAsk] = data.bbo;
    if (!bestBid && !bestAsk) {
        return;
    }
    const bidPrice = bestBid ? parseFloat(bestBid.px) : 0;
    const askPrice = bestAsk ? parseFloat(bestAsk.px) : 0;
    const spread = bidPrice > 0 && askPrice > 0 ? (askPrice - bidPrice).toFixed(5) : undefined;
    orderBookCache.set(symbol, {
        bestBid: bestBid?.px,
        bestAsk: bestAsk?.px,
        spread,
        lastUpdated: Date.now(),
    });
    const currentCachedPrice = cachedPriceData?.get(symbol);
    if (!currentCachedPrice) {
        return;
    }
    const updatedPrice = createPriceUpdate(symbol, currentCachedPrice.price);
    if (cachedPriceData) {
        cachedPriceData.set(symbol, updatedPrice);
        notifySubscribers();
    }
}
exports.processBboData = processBboData;
//# sourceMappingURL=hyperLiquidOrderBookProcessor.cjs.map