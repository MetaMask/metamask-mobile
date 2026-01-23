import type { BboWsEvent, L2BookResponse } from '@nktkas/hyperliquid';
import type { PriceUpdate } from '../controllers/types';

/**
 * HyperLiquid Order Book Processor
 *
 * Utility functions for processing Level 2 order book data from HyperLiquid WebSocket.
 * Extracts best bid/ask prices, calculates spreads, and updates caches.
 */

/**
 * Order book cache entry structure
 */
export interface OrderBookCacheEntry {
  bestBid?: string;
  bestAsk?: string;
  spread?: string;
  lastUpdated: number;
}

/**
 * Parameters for processing L2 book data
 */
export interface ProcessL2BookDataParams {
  symbol: string;
  data: L2BookResponse;
  orderBookCache: Map<string, OrderBookCacheEntry>;
  cachedPriceData: Map<string, PriceUpdate> | null;
  createPriceUpdate: (symbol: string, price: string) => PriceUpdate;
  notifySubscribers: () => void;
}

export interface ProcessBboDataParams {
  symbol: string;
  data: BboWsEvent;
  orderBookCache: Map<string, OrderBookCacheEntry>;
  cachedPriceData: Map<string, PriceUpdate> | null;
  createPriceUpdate: (symbol: string, price: string) => PriceUpdate;
  notifySubscribers: () => void;
}

/**
 * Process Level 2 order book data and update caches
 *
 * Extracts best bid/ask prices from order book levels, calculates spread,
 * and updates the order book cache and price data cache.
 *
 * @param params - Processing parameters
 */
export function processL2BookData(params: ProcessL2BookDataParams): void {
  const {
    symbol,
    data,
    orderBookCache,
    cachedPriceData,
    createPriceUpdate,
    notifySubscribers,
  } = params;

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
  const spread =
    bidPrice > 0 && askPrice > 0 ? (askPrice - bidPrice).toFixed(5) : undefined;

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

/**
 * Process BBO (best bid/offer) data and update caches
 *
 * BBO is lightweight and independent from L2Book aggregation parameters,
 * making it ideal for spread / top-of-book display.
 */
export function processBboData(params: ProcessBboDataParams): void {
  const {
    symbol,
    data,
    orderBookCache,
    cachedPriceData,
    createPriceUpdate,
    notifySubscribers,
  } = params;

  if (data?.coin !== symbol || !data?.bbo) {
    return;
  }

  const [bestBid, bestAsk] = data.bbo;
  if (!bestBid && !bestAsk) {
    return;
  }

  const bidPrice = bestBid ? parseFloat(bestBid.px) : 0;
  const askPrice = bestAsk ? parseFloat(bestAsk.px) : 0;
  const spread =
    bidPrice > 0 && askPrice > 0 ? (askPrice - bidPrice).toFixed(5) : undefined;

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
