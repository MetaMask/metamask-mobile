import React, { createContext, useContext } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  PriceUpdate,
  Position,
  Order,
  OrderFill,
  AccountState,
  PerpsMarketData,
} from '../controllers/types';
import { PERFORMANCE_CONFIG } from '../constants/perpsConfig';
import { getE2EMockStreamManager } from '../utils/e2eBridgePerps';

// Generic subscription parameters
interface StreamSubscription<T> {
  id: string;
  callback: (data: T) => void;
  throttleMs?: number;
  timer?: NodeJS.Timeout;
  pendingUpdate?: T;
  hasReceivedFirstUpdate?: boolean; // Track if subscriber has received first update
}

// Base class for any stream type
abstract class StreamChannel<T> {
  protected cache = new Map<string, T>();
  protected subscribers = new Map<string, StreamSubscription<T>>();
  protected wsSubscription: (() => void) | null = null;

  protected notifySubscribers(updates: T) {
    this.subscribers.forEach((subscriber) => {
      // Check if this is the first update for this subscriber
      if (!subscriber.hasReceivedFirstUpdate) {
        subscriber.callback(updates);
        subscriber.hasReceivedFirstUpdate = true;
        return; // Don't set up throttle for the first update
      }

      // If no throttling (throttleMs is 0 or undefined), notify immediately
      if (!subscriber.throttleMs) {
        subscriber.callback(updates);
        return;
      }

      // For subsequent updates with throttling, use throttle logic
      // Store pending update
      subscriber.pendingUpdate = updates;

      // Only set timer if one isn't already running
      if (!subscriber.timer) {
        subscriber.timer = setTimeout(() => {
          if (subscriber.pendingUpdate) {
            subscriber.callback(subscriber.pendingUpdate);
            subscriber.pendingUpdate = undefined;
            subscriber.timer = undefined;
          }
        }, subscriber.throttleMs);
      }
    });
  }

  subscribe(params: {
    callback: (data: T) => void;
    throttleMs?: number;
  }): () => void {
    const id = Math.random().toString(36);

    const subscription: StreamSubscription<T> = {
      id,
      ...params,
      hasReceivedFirstUpdate: false, // Initialize as false
    };
    this.subscribers.set(id, subscription);

    // Give immediate cached data if available
    const cached = this.getCachedData();
    if (cached) {
      params.callback(cached);
      // Mark as having received first update since we provided cached data
      subscription.hasReceivedFirstUpdate = true;
    }

    // Ensure WebSocket connected
    this.connect();

    return () => {
      const sub = this.subscribers.get(id);
      if (sub?.timer) {
        clearTimeout(sub.timer);
      }
      this.subscribers.delete(id);

      // Disconnect if no subscribers
      if (this.subscribers.size === 0) {
        this.disconnect();
      }
    };
  }

  protected connect() {
    // Override in subclasses
  }

  protected disconnect() {
    if (this.wsSubscription) {
      this.wsSubscription();
      this.wsSubscription = null;
    }
  }

  protected getCachedData(): T | null {
    // Override in subclasses to return null for no cache, or actual data
    return null;
  }

  public clearCache(): void {
    this.cache.clear();
    // Disconnect existing WebSocket subscription to force reconnect with new account
    if (this.wsSubscription) {
      this.disconnect();
    }
    // Notify subscribers immediately with cleared data (bypass throttling)
    // Subclasses should override getClearedData() to provide appropriate empty state
    const clearedData = this.getClearedData();
    this.subscribers.forEach((subscriber) => {
      // Clear any pending updates and timers
      if (subscriber.timer) {
        clearTimeout(subscriber.timer);
        subscriber.timer = undefined;
      }
      subscriber.pendingUpdate = undefined;
      // Notify immediately with cleared data
      subscriber.callback(clearedData);
    });
    // If we have active subscribers, reconnect with the new account
    if (this.subscribers.size > 0) {
      // Small delay to ensure old connection is fully closed
      setTimeout(() => this.connect(), 100);
    }
  }

  protected abstract getClearedData(): T;
}

// Specific channel for prices
class PriceStreamChannel extends StreamChannel<Record<string, PriceUpdate>> {
  private symbols = new Set<string>();
  private prewarmUnsubscribe?: () => void;
  private allMarketSymbols: string[] = [];
  // Override cache to store individual PriceUpdate objects
  protected priceCache = new Map<string, PriceUpdate>();

  protected connect() {
    if (this.wsSubscription) {
      return;
    }

    // If we have a prewarm subscription, we're already subscribed to all markets
    // No need to create another subscription
    if (this.prewarmUnsubscribe) {
      // Just notify subscribers with cached data
      const cached = this.getCachedData();
      if (cached) {
        this.notifySubscribers(cached);
      }
      return;
    }

    // Collect all unique symbols from subscribers
    const allSymbols = Array.from(this.symbols);

    DevLogger.log(
      `PriceStreamChannel: allSymbols len=`,
      allSymbols.length,
      allSymbols,
    );

    if (allSymbols.length === 0) {
      return;
    }

    this.wsSubscription = Engine.context.PerpsController.subscribeToPrices({
      symbols: allSymbols, // Subscribe to specific symbols
      callback: (updates: PriceUpdate[]) => {
        // Update cache and build price map
        const priceMap: Record<string, PriceUpdate> = {};
        updates.forEach((update) => {
          // Map the update to PriceUpdate format
          const priceUpdate: PriceUpdate = {
            coin: update.coin,
            price: update.price,
            timestamp: Date.now(),
            percentChange24h: update.percentChange24h,
            bestBid: update.bestBid,
            bestAsk: update.bestAsk,
            spread: update.spread,
            markPrice: update.markPrice,
            funding: update.funding,
            openInterest: update.openInterest,
            volume24h: update.volume24h,
          };
          this.priceCache.set(update.coin, priceUpdate);
          priceMap[update.coin] = priceUpdate;
        });

        this.notifySubscribers(priceMap);
      },
    });
  }

  protected getCachedData(): Record<string, PriceUpdate> | null {
    if (this.priceCache.size === 0) return null;
    const cached: Record<string, PriceUpdate> = {};
    this.priceCache.forEach((value, key) => {
      cached[key] = value;
    });
    return cached;
  }

  protected getClearedData(): Record<string, PriceUpdate> {
    return {};
  }

  public clearCache(): void {
    // Clear the price-specific cache
    this.priceCache.clear();
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // Call parent clearCache
    super.clearCache();
  }

  subscribeToSymbols(params: {
    symbols: string[];
    callback: (prices: Record<string, PriceUpdate>) => void;
    throttleMs?: number;
  }): () => void {
    // Track symbols for filtering
    params.symbols.forEach((s) => {
      this.symbols.add(s);
    });

    // Ensure connection is established (allMids provides all symbols)
    // No need to reconnect when new symbols are added since allMids
    // already provides prices for all markets
    if (!this.wsSubscription && !this.prewarmUnsubscribe) {
      this.connect();
    }

    return this.subscribe({
      callback: (allPrices) => {
        // Filter to only requested symbols
        const filtered: Record<string, PriceUpdate> = {};
        params.symbols.forEach((symbol) => {
          if (allPrices[symbol]) {
            filtered[symbol] = allPrices[symbol];
          }
        });
        params.callback(filtered);
      },
      throttleMs: params.throttleMs,
    });
  }

  /**
   * Pre-warm the channel by subscribing to all market prices
   * This keeps a single WebSocket connection alive with all price updates
   * @returns Cleanup function to call when leaving Perps environment
   */
  public async prewarm(): Promise<() => void> {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('PriceStreamChannel: Already pre-warmed');
      return this.prewarmUnsubscribe;
    }

    try {
      // Get all available market symbols
      const controller = Engine.context.PerpsController;
      const markets = await controller.getMarkets();
      this.allMarketSymbols = markets.map((market) => market.name);

      DevLogger.log('PriceStreamChannel: Pre-warming with all market symbols', {
        symbolCount: this.allMarketSymbols.length,
        symbols: this.allMarketSymbols.slice(0, 10), // Log first 10 for debugging
      });

      // Subscribe to all market prices
      this.prewarmUnsubscribe = controller.subscribeToPrices({
        symbols: this.allMarketSymbols,
        callback: (updates: PriceUpdate[]) => {
          // Update cache and build price map
          const priceMap: Record<string, PriceUpdate> = {};
          updates.forEach((update) => {
            const priceUpdate: PriceUpdate = {
              coin: update.coin,
              price: update.price,
              timestamp: Date.now(),
              percentChange24h: update.percentChange24h,
              bestBid: update.bestBid,
              bestAsk: update.bestAsk,
              spread: update.spread,
              markPrice: update.markPrice,
              funding: update.funding,
              openInterest: update.openInterest,
              volume24h: update.volume24h,
            };
            this.priceCache.set(update.coin, priceUpdate);
            priceMap[update.coin] = priceUpdate;
          });

          // Notify any active subscribers with all updates
          if (this.subscribers.size > 0) {
            this.notifySubscribers(priceMap);
          }
        },
      });

      // Return a cleanup function that properly clears internal state
      return () => {
        DevLogger.log('PriceStreamChannel: Cleaning up prewarm subscription');
        this.cleanupPrewarm();
      };
    } catch (error) {
      DevLogger.log('PriceStreamChannel: Failed to prewarm prices', error);
      // Return no-op cleanup function
      return () => {
        // No-op
      };
    }
  }

  /**
   * Cleanup pre-warm subscription
   */
  public cleanupPrewarm(): void {
    if (this.prewarmUnsubscribe) {
      this.prewarmUnsubscribe();
      this.prewarmUnsubscribe = undefined;
      this.allMarketSymbols = [];
    }
  }
}

// Specific channel for orders
class OrderStreamChannel extends StreamChannel<Order[]> {
  private prewarmUnsubscribe?: () => void;

  protected connect() {
    if (this.wsSubscription) return;

    // This calls HyperLiquidSubscriptionService.subscribeToOrders which uses shared webData2
    this.wsSubscription = Engine.context.PerpsController.subscribeToOrders({
      callback: (orders: Order[]) => {
        this.cache.set('orders', orders);
        this.notifySubscribers(orders);
      },
    });
  }

  protected getCachedData() {
    // Return null if no cache exists to distinguish from empty array
    const cached = this.cache.get('orders');
    return cached !== undefined ? cached : null;
  }

  protected getClearedData(): Order[] {
    return [];
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('OrderStreamChannel: Already pre-warmed');
      return this.prewarmUnsubscribe;
    }

    // Create a real subscription with no-op callback to keep connection alive
    this.prewarmUnsubscribe = this.subscribe({
      callback: () => {
        // No-op callback - just keeps the connection alive for caching
      },
      throttleMs: 0, // No throttle for pre-warm
    });

    // Return cleanup function that clears internal state
    return () => {
      DevLogger.log('OrderStreamChannel: Cleaning up prewarm subscription');
      this.cleanupPrewarm();
    };
  }

  /**
   * Cleanup pre-warm subscription
   */
  public cleanupPrewarm(): void {
    if (this.prewarmUnsubscribe) {
      this.prewarmUnsubscribe();
      this.prewarmUnsubscribe = undefined;
    }
  }

  public clearCache(): void {
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // Call parent clearCache
    super.clearCache();
  }
}

// Specific channel for positions
class PositionStreamChannel extends StreamChannel<Position[]> {
  private prewarmUnsubscribe?: () => void;

  protected connect() {
    if (this.wsSubscription) return;

    // This calls HyperLiquidSubscriptionService.subscribeToPositions which uses shared webData2
    this.wsSubscription = Engine.context.PerpsController.subscribeToPositions({
      callback: (positions: Position[]) => {
        this.cache.set('positions', positions);
        this.notifySubscribers(positions);
      },
    });
  }

  protected getCachedData() {
    // Return null if no cache exists to distinguish from empty array
    const cached = this.cache.get('positions');
    return cached !== undefined ? cached : null;
  }

  protected getClearedData(): Position[] {
    return [];
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('PositionStreamChannel: Already pre-warmed');
      return this.prewarmUnsubscribe;
    }

    // Create a real subscription with no-op callback to keep connection alive
    this.prewarmUnsubscribe = this.subscribe({
      callback: () => {
        // No-op callback - just keeps the connection alive for caching
      },
      throttleMs: 0, // No throttle for pre-warm
    });

    // Return cleanup function that clears internal state
    return () => {
      DevLogger.log('PositionStreamChannel: Cleaning up prewarm subscription');
      this.cleanupPrewarm();
    };
  }

  public clearCache(): void {
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // Call parent clearCache
    super.clearCache();
  }

  /**
   * Cleanup pre-warm subscription
   */
  public cleanupPrewarm(): void {
    if (this.prewarmUnsubscribe) {
      this.prewarmUnsubscribe();
      this.prewarmUnsubscribe = undefined;
    }
  }
}

// Specific channel for fills
class FillStreamChannel extends StreamChannel<OrderFill[]> {
  protected connect() {
    if (this.wsSubscription) return;

    this.wsSubscription = Engine.context.PerpsController.subscribeToOrderFills({
      callback: (fills: OrderFill[]) => {
        // Append to existing fills (it's a time series)
        const existing = this.cache.get('fills') || [];
        const updated = [...existing, ...fills].slice(-100); // Keep last 100
        this.cache.set('fills', updated);
        this.notifySubscribers(updated);
      },
    });
  }

  protected getCachedData() {
    return this.cache.get('fills') || [];
  }

  protected getClearedData(): OrderFill[] {
    return [];
  }
}

// Specific channel for account state
class AccountStreamChannel extends StreamChannel<AccountState | null> {
  private prewarmUnsubscribe?: () => void;

  protected connect() {
    if (this.wsSubscription) return;

    this.wsSubscription = Engine.context.PerpsController.subscribeToAccount({
      callback: (account: AccountState) => {
        // Use base cache Map with consistent key
        this.cache.set('account', account);
        this.notifySubscribers(account as AccountState | null);
      },
    });
  }

  protected getCachedData(): AccountState | null {
    // Return cached data for instant display
    return this.cache.get('account') || null;
  }

  protected getClearedData(): AccountState | null {
    return null;
  }

  public clearCache(): void {
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // Call parent clearCache
    super.clearCache();
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('AccountStreamChannel: Already pre-warmed');
      return this.prewarmUnsubscribe;
    }

    // Create a real subscription with no-op callback to keep connection alive
    this.prewarmUnsubscribe = this.subscribe({
      callback: () => {
        // No-op callback - just keeps the connection alive for caching
      },
      throttleMs: 0, // No throttle for pre-warm
    });

    // Return cleanup function that clears internal state
    return () => {
      DevLogger.log('AccountStreamChannel: Cleaning up prewarm subscription');
      this.cleanupPrewarm();
    };
  }

  /**
   * Cleanup pre-warm subscription
   */
  public cleanupPrewarm(): void {
    if (this.prewarmUnsubscribe) {
      this.prewarmUnsubscribe();
      this.prewarmUnsubscribe = undefined;
    }
  }
}

// Market data channel for caching market list data
class MarketDataChannel extends StreamChannel<PerpsMarketData[]> {
  private lastFetchTime = 0;
  private fetchPromise: Promise<void> | null = null;
  private readonly CACHE_DURATION =
    PERFORMANCE_CONFIG.MARKET_DATA_CACHE_DURATION_MS;

  protected connect() {
    // Fetch if cache is stale or empty
    const now = Date.now();
    const cached = this.cache.get('markets');
    const cacheAge = now - this.lastFetchTime;
    if (!cached || cacheAge > this.CACHE_DURATION) {
      DevLogger.log('PerpsStreamManager: Cache miss or stale', {
        hasCached: !!cached,
        cacheAgeMs: cached ? cacheAge : null,
        cacheExpired: cacheAge > this.CACHE_DURATION,
        cacheDurationMs: this.CACHE_DURATION,
      });
      // Don't await - just trigger the fetch and handle errors
      this.fetchMarketData().catch((error) => {
        console.error('PerpsStreamManager: Failed to fetch market data', error);
      });
    } else {
      DevLogger.log('PerpsStreamManager: Using cached market data', {
        cacheAgeMs: cacheAge,
        cacheAgeSeconds: Math.round(cacheAge / 1000),
        marketCount: cached.length,
        cacheValidForMs: this.CACHE_DURATION - cacheAge,
      });
      // Notify subscribers with cached data immediately
      this.notifySubscribers(cached);
    }
  }

  private async fetchMarketData(): Promise<void> {
    // Prevent concurrent fetches
    if (this.fetchPromise) {
      await this.fetchPromise;
      return;
    }

    this.fetchPromise = (async () => {
      const fetchStartTime = Date.now();
      try {
        DevLogger.log(
          'PerpsStreamManager: Fetching fresh market data from API',
        );

        const controller = Engine.context.PerpsController;
        const provider = controller.getActiveProvider();
        const data = await provider.getMarketDataWithPrices();
        const fetchTime = Date.now() - fetchStartTime;

        // Update cache
        this.cache.set('markets', data);
        this.lastFetchTime = Date.now();

        // Notify all subscribers
        this.notifySubscribers(data);

        DevLogger.log('PerpsStreamManager: Market data fetched and cached', {
          marketCount: data.length,
          fetchTimeMs: fetchTime,
          cacheValidUntil: new Date(
            Date.now() + this.CACHE_DURATION,
          ).toISOString(),
        });
      } catch (error) {
        const fetchTime = Date.now() - fetchStartTime;
        DevLogger.log('PerpsStreamManager: Failed to fetch market data', {
          error,
          fetchTimeMs: fetchTime,
        });
        // Keep existing cache if fetch fails
        const existing = this.cache.get('markets');
        if (existing) {
          DevLogger.log(
            'PerpsStreamManager: Using stale cache after fetch failure',
            {
              marketCount: existing.length,
            },
          );
          this.notifySubscribers(existing);
        }
      } finally {
        this.fetchPromise = null;
      }
    })();

    await this.fetchPromise;
  }

  /**
   * Force refresh market data
   */
  public async refresh(): Promise<void> {
    this.lastFetchTime = 0; // Force cache to be considered stale
    await this.fetchMarketData();
  }

  protected getCachedData(): PerpsMarketData[] | null {
    return this.cache.get('markets') || null;
  }

  protected getClearedData(): PerpsMarketData[] {
    return [];
  }

  /**
   * Prewarm market data cache
   * @returns Cleanup function (no-op for REST data)
   */
  public prewarm(): () => void {
    // Fetch data immediately to populate cache
    this.fetchMarketData().catch((error) => {
      DevLogger.log('PerpsStreamManager: Failed to prewarm market data', error);
    });

    // No cleanup needed for REST data
    return () => {
      // No-op
    };
  }

  /**
   * Clear cache and reset fetch time
   */
  public clearCache(): void {
    super.clearCache();
    this.lastFetchTime = 0;
    this.fetchPromise = null;
  }
}

// Main manager class
export class PerpsStreamManager {
  public readonly prices = new PriceStreamChannel();
  public readonly orders = new OrderStreamChannel();
  public readonly positions = new PositionStreamChannel();
  public readonly fills = new FillStreamChannel();
  public readonly account = new AccountStreamChannel();
  public readonly marketData = new MarketDataChannel();

  // Future channels can be added here:
  // public readonly funding = new FundingStreamChannel();
  // public readonly orderBook = new OrderBookStreamChannel();
  // public readonly trades = new TradeStreamChannel();
}

// Singleton instance
const streamManager = new PerpsStreamManager();

// Export singleton for pre-warming in PerpsConnectionManager
export const getStreamManagerInstance = () => streamManager;

// Context
const PerpsStreamContext = createContext<PerpsStreamManager | null>(null);

export const PerpsStreamProvider: React.FC<{
  children: React.ReactNode;
  testStreamManager?: PerpsStreamManager; // Only for testing
}> = ({ children, testStreamManager }) => {
  // Check for E2E mock stream manager
  const e2eMockStreamManager =
    getE2EMockStreamManager() as PerpsStreamManager | null;

  const selectedManager: PerpsStreamManager =
    testStreamManager || e2eMockStreamManager || streamManager;

  DevLogger.log('PerpsStreamProvider: Using stream manager:', {
    isTestManager: !!testStreamManager,
    isE2EMockManager: !!e2eMockStreamManager,
    isRealManager: selectedManager === streamManager,
  });

  return (
    <PerpsStreamContext.Provider value={selectedManager}>
      {children}
    </PerpsStreamContext.Provider>
  );
};

export const usePerpsStream = () => {
  const context = useContext(PerpsStreamContext);
  if (!context) {
    throw new Error('usePerpsStream must be used within PerpsStreamProvider');
  }
  return context;
};

// Types are exported from controllers/types
