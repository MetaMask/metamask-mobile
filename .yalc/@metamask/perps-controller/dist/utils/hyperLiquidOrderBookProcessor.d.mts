import type { BboWsEvent, L2BookResponse } from "@nktkas/hyperliquid";
import type { PriceUpdate } from "../types/index.mjs";
/**
 * HyperLiquid Order Book Processor
 *
 * Utility functions for processing Level 2 order book data from HyperLiquid WebSocket.
 * Extracts best bid/ask prices, calculates spreads, and updates caches.
 */
/**
 * Order book cache entry structure
 */
export type OrderBookCacheEntry = {
    bestBid?: string;
    bestAsk?: string;
    spread?: string;
    lastUpdated: number;
};
/**
 * Parameters for processing L2 book data
 */
export type ProcessL2BookDataParams = {
    symbol: string;
    data: L2BookResponse;
    orderBookCache: Map<string, OrderBookCacheEntry>;
    cachedPriceData: Map<string, PriceUpdate> | null;
    createPriceUpdate: (symbol: string, price: string) => PriceUpdate;
    notifySubscribers: () => void;
};
export type ProcessBboDataParams = {
    symbol: string;
    data: BboWsEvent;
    orderBookCache: Map<string, OrderBookCacheEntry>;
    cachedPriceData: Map<string, PriceUpdate> | null;
    createPriceUpdate: (symbol: string, price: string) => PriceUpdate;
    notifySubscribers: () => void;
};
/**
 * Process Level 2 order book data and update caches
 *
 * Extracts best bid/ask prices from order book levels, calculates spread,
 * and updates the order book cache and price data cache.
 *
 * @param params - Processing parameters
 */
export declare function processL2BookData(params: ProcessL2BookDataParams): void;
/**
 * Process BBO (best bid/offer) data and update caches
 *
 * BBO is lightweight and independent from L2Book aggregation parameters,
 * making it ideal for spread / top-of-book display.
 *
 * @param params - The BBO processing parameters including symbol, data, and caches.
 */
export declare function processBboData(params: ProcessBboDataParams): void;
//# sourceMappingURL=hyperLiquidOrderBookProcessor.d.mts.map