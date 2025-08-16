import React, { createContext, useContext } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
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
  debounceMs: number;
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
        DevLogger.log(
          `StreamChannel: First update for subscriber ${subscriber.id}, executing immediately`,
        );
        subscriber.callback(updates);
        subscriber.hasReceivedFirstUpdate = true;
        return; // Don't set up debounce for the first update
      }

      // For subsequent updates, use debounce logic
      // Store pending update
      subscriber.pendingUpdate = updates;

      // Only set timer if one isn't already running
      if (!subscriber.timer) {
        DevLogger.log(
          `StreamChannel: Setting ${subscriber.debounceMs}ms timer for subscriber ${subscriber.id}`,
        );
        subscriber.timer = setTimeout(() => {
          if (subscriber.pendingUpdate) {
            DevLogger.log(
              `StreamChannel: Executing callback for subscriber ${subscriber.id} after ${subscriber.debounceMs}ms`,
            );
            subscriber.callback(subscriber.pendingUpdate);
            subscriber.pendingUpdate = undefined;
            subscriber.timer = undefined;
          }
        }, subscriber.debounceMs);
      }
    });
  }

  subscribe(params: {
    callback: (data: T) => void;
    debounceMs: number;
  }): () => void {
    const id = Math.random().toString(36);

    DevLogger.log(
      `StreamChannel: New subscriber ${id} with ${params.debounceMs}ms debounce`,
    );
    const subscription: StreamSubscription<T> = {
      id,
      ...params,
      hasReceivedFirstUpdate: false, // Initialize as false
    };
    this.subscribers.set(id, subscription);

    // Give immediate cached data if available
    const cached = this.getCachedData();
    if (cached) {
      DevLogger.log(`StreamChannel: Providing cached data to subscriber ${id}`);
      params.callback(cached);
      // Mark as having received first update since we provided cached data
      subscription.hasReceivedFirstUpdate = true;
    }

    // Ensure WebSocket connected
    this.connect();

    return () => {
      DevLogger.log(`StreamChannel: Removing subscriber ${id}`);
      const sub = this.subscribers.get(id);
      if (sub?.timer) {
        clearTimeout(sub.timer);
      }
      this.subscribers.delete(id);

      // Disconnect if no subscribers
      if (this.subscribers.size === 0) {
        DevLogger.log('StreamChannel: No subscribers left, disconnecting');
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
      DevLogger.log('PriceStream: Already connected');
      return;
    }

    // Collect all unique symbols from subscribers
    const allSymbols = Array.from(this.symbols);

    if (allSymbols.length === 0) {
      DevLogger.log('PriceStream: No symbols to subscribe to yet');
      return;
    }

    DevLogger.log('PriceStream: Establishing WebSocket subscription', {
      symbols: allSymbols,
    });

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
    DevLogger.log('PriceStream: WebSocket subscription established');
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
    debounceMs: number;
  }): () => void {
    // Track new symbols
    const newSymbols: string[] = [];
    params.symbols.forEach((s) => {
      if (!this.symbols.has(s)) {
        newSymbols.push(s);
      }
      this.symbols.add(s);
    });

    DevLogger.log(
      `PriceStream: Component subscribing to symbols with ${params.debounceMs}ms debounce`,
      { symbols: params.symbols, newSymbols },
    );

    // If we have new symbols and WebSocket is already connected, we need to reconnect
    if (newSymbols.length > 0 && this.wsSubscription) {
      DevLogger.log(
        'PriceStream: New symbols detected, reconnecting WebSocket',
      );
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
        DevLogger.log(
          `PriceStream: Sending filtered prices to component (${params.debounceMs}ms debounce)`,
          {
            symbols: Object.keys(filtered),
            count: Object.keys(filtered).length,
          },
        );
        params.callback(filtered);
      },
      debounceMs: params.debounceMs,
    });
  }
}

// Specific channel for orders
class OrderStreamChannel extends StreamChannel<Order[]> {
  protected connect() {
    if (this.wsSubscription) return;

    // For now, we'll use polling until WebSocket is available
    // This will be replaced with actual WebSocket subscription
    const controller = Engine.context.PerpsController;
    const pollInterval = setInterval(async () => {
      try {
        const orders = await controller.getOrders();
        this.cache.set('orders', orders);
        this.notifySubscribers(orders);
      } catch (error) {
        // Handle error silently
      }
    }, 5000);

    this.wsSubscription = () => clearInterval(pollInterval);
  }

  protected getCachedData() {
    return this.cache.get('orders') || [];
  }
}

// Specific channel for positions
class PositionStreamChannel extends StreamChannel<Position[]> {
  protected connect() {
    if (this.wsSubscription) return;

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
class PerpsStreamManager {
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

// Context
const PerpsStreamContext = createContext<PerpsStreamManager | null>(null);

export const PerpsStreamProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <PerpsStreamContext.Provider value={streamManager}>
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
