import React, { createContext, useContext } from 'react';
import Engine from '../../../../core/Engine';
import type {
  PriceUpdate,
  Position,
  Order,
  OrderFill,
} from '../controllers/types';

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
class StreamChannel<T> {
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
    // Override in subclasses
    return null;
  }
}

// Specific channel for prices
class PriceStreamChannel extends StreamChannel<Record<string, PriceUpdate>> {
  private symbols = new Set<string>();
  // Override cache to store individual PriceUpdate objects
  protected priceCache = new Map<string, PriceUpdate>();

  protected connect() {
    if (this.wsSubscription) {
      return;
    }

    // Collect all unique symbols from subscribers
    const allSymbols = Array.from(this.symbols);

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

  subscribeToSymbols(params: {
    symbols: string[];
    callback: (prices: Record<string, PriceUpdate>) => void;
    throttleMs?: number;
  }): () => void {
    // Track new symbols
    const newSymbols: string[] = [];
    params.symbols.forEach((s) => {
      if (!this.symbols.has(s)) {
        newSymbols.push(s);
      }
      this.symbols.add(s);
    });

    // If we have new symbols and WebSocket is already connected, we need to reconnect
    if (newSymbols.length > 0 && this.wsSubscription) {
      this.disconnect();
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
    return this.cache.get('orders') || [];
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      return this.prewarmUnsubscribe;
    }

    // Create a real subscription with no-op callback to keep connection alive
    this.prewarmUnsubscribe = this.subscribe({
      callback: () => {
        // No-op callback - just keeps the connection alive for caching
      },
      throttleMs: 0, // No throttle for pre-warm
    });

    return this.prewarmUnsubscribe;
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
    return this.cache.get('positions') || [];
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      return this.prewarmUnsubscribe;
    }

    // Create a real subscription with no-op callback to keep connection alive
    this.prewarmUnsubscribe = this.subscribe({
      callback: () => {
        // No-op callback - just keeps the connection alive for caching
      },
      throttleMs: 0, // No throttle for pre-warm
    });

    return this.prewarmUnsubscribe;
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
}

// Main manager class
export class PerpsStreamManager {
  public readonly prices = new PriceStreamChannel();
  public readonly orders = new OrderStreamChannel();
  public readonly positions = new PositionStreamChannel();
  public readonly fills = new FillStreamChannel();

  // Future channels can be added here:
  // public readonly funding = new FundingStreamChannel();
  // public readonly accountState = new AccountStreamChannel();
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
}> = ({ children, testStreamManager }) => (
  <PerpsStreamContext.Provider value={testStreamManager || streamManager}>
    {children}
  </PerpsStreamContext.Provider>
);

export const usePerpsStream = () => {
  const context = useContext(PerpsStreamContext);
  if (!context) {
    throw new Error('usePerpsStream must be used within PerpsStreamProvider');
  }
  return context;
};

// Types are exported from controllers/types
