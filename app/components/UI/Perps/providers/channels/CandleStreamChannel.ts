import Engine from '../../../../../core/Engine';
import type { CandleData } from '../../types/perps-types';
import { CandlePeriod } from '../../constants/chartConfig';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';

// Generic subscription parameters
interface StreamSubscription<T> {
  id: string;
  cacheKey: string; // Associated cacheKey (coin-interval) for filtering
  callback: (data: T) => void;
  throttleMs?: number;
  timer?: NodeJS.Timeout;
  pendingUpdate?: T;
  hasReceivedFirstUpdate?: boolean;
}

// Base class for stream channel (simplified version)
abstract class StreamChannel<T> {
  protected cache = new Map<string, T>();
  protected subscribers = new Map<string, StreamSubscription<T>>();
  protected wsSubscriptions = new Map<string, () => void>();
  protected isPaused = false;

  protected notifySubscribers(cacheKey: string, updates: T) {
    if (this.isPaused) {
      return;
    }

    // Filter subscribers to only those matching this cacheKey
    const matchingSubscribers = Array.from(this.subscribers.values()).filter(
      (sub) => sub.cacheKey === cacheKey,
    );

    matchingSubscribers.forEach((subscriber) => {
      // Check if this is the first update for this subscriber
      if (!subscriber.hasReceivedFirstUpdate) {
        subscriber.callback(updates);
        subscriber.hasReceivedFirstUpdate = true;
        return;
      }

      // If no throttling, notify immediately
      if (!subscriber.throttleMs) {
        subscriber.callback(updates);
        return;
      }

      // Store pending update
      subscriber.pendingUpdate = updates;

      // Throttle pattern
      if (!subscriber.timer) {
        subscriber.timer = setTimeout(() => {
          if (subscriber.pendingUpdate) {
            subscriber.callback(subscriber.pendingUpdate);
            subscriber.pendingUpdate = undefined;
          }
          subscriber.timer = undefined;
        }, subscriber.throttleMs);
      }
    });
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
  }

  public clearCache(): void {
    this.subscribers.forEach((subscriber) => {
      if (subscriber.timer) {
        clearTimeout(subscriber.timer);
        subscriber.timer = undefined;
      }
      subscriber.pendingUpdate = undefined;
    });

    // Disconnect all WebSocket subscriptions
    this.wsSubscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.wsSubscriptions.clear();

    this.cache.clear();

    // Notify subscribers with cleared data
    this.subscribers.forEach((subscriber) => {
      subscriber.callback(this.getClearedData());
    });
  }

  protected abstract getClearedData(): T;
}

// CandleStreamChannel - specific channel for candle data
export class CandleStreamChannel extends StreamChannel<CandleData> {
  /**
   * Get cache key for a specific coin and interval
   */
  private getCacheKey(coin: string, interval: CandlePeriod): string {
    return `${coin}-${interval}`;
  }

  /**
   * Subscribe to candle updates for a specific coin and interval
   */
  public subscribe(params: {
    coin: string;
    interval: CandlePeriod;
    callback: (data: CandleData) => void;
    throttleMs?: number;
  }): () => void {
    const { coin, interval, callback, throttleMs } = params;
    const cacheKey = this.getCacheKey(coin, interval);
    const id = Math.random().toString(36);

    const subscription: StreamSubscription<CandleData> = {
      id,
      cacheKey, // Store cacheKey to filter subscribers by their subscription
      callback,
      throttleMs,
      hasReceivedFirstUpdate: false,
    };
    this.subscribers.set(id, subscription);

    // Give immediate cached data if available
    const cached = this.cache.get(cacheKey);
    if (cached) {
      callback(cached);
      subscription.hasReceivedFirstUpdate = true;
    }

    // Ensure WebSocket connected for this coin+interval
    this.connect(coin, interval, cacheKey);

    // Return unsubscribe function
    return () => {
      const sub = this.subscribers.get(id);
      if (sub?.timer) {
        clearTimeout(sub.timer);
        sub.timer = undefined;
      }
      this.subscribers.delete(id);

      // Count remaining subscribers for THIS specific cacheKey
      const remainingForThisKey = Array.from(this.subscribers.values()).filter(
        (s) => s.cacheKey === cacheKey,
      ).length;

      // Disconnect WebSocket if no subscribers remain for this coin+interval
      if (remainingForThisKey === 0) {
        DevLogger.log(
          'CandleStreamChannel: Disconnecting WebSocket (no subscribers)',
          {
            cacheKey,
          },
        );
        this.disconnect(cacheKey);
      }
    };
  }

  /**
   * Connect to WebSocket for specific coin and interval
   */
  private connect(
    coin: string,
    interval: CandlePeriod,
    cacheKey: string,
  ): void {
    // Skip if already connected for this coin+interval
    if (this.wsSubscriptions.has(cacheKey)) {
      return;
    }

    // Check if controller is reinitializing
    if (Engine.context.PerpsController.isCurrentlyReinitializing()) {
      setTimeout(
        () => this.connect(coin, interval, cacheKey),
        PERPS_CONSTANTS.RECONNECTION_CLEANUP_DELAY_MS,
      );
      return;
    }

    // Subscribe to candle updates via controller
    const unsubscribe = Engine.context.PerpsController.subscribeToCandles({
      coin,
      interval,
      callback: (candleData: CandleData) => {
        // Update cache
        this.cache.set(cacheKey, candleData);

        // Notify all subscribers
        this.notifySubscribers(cacheKey, candleData);
      },
    });

    // Log subscription establishment (once per subscription)
    DevLogger.log('CandleStreamChannel: WebSocket subscription established', {
      coin,
      interval,
      cacheKey,
    });

    // Store cleanup function
    this.wsSubscriptions.set(cacheKey, unsubscribe);
  }

  /**
   * Disconnect from WebSocket for specific coin+interval
   */
  private disconnect(cacheKey: string): void {
    const unsubscribe = this.wsSubscriptions.get(cacheKey);
    if (unsubscribe) {
      unsubscribe();
      this.wsSubscriptions.delete(cacheKey);
    }
  }

  /**
   * Get cached data for specific coin and interval
   */
  public getCachedData(
    coin: string,
    interval: CandlePeriod,
  ): CandleData | null {
    const cacheKey = this.getCacheKey(coin, interval);
    return this.cache.get(cacheKey) || null;
  }

  /**
   * Get cleared data (empty candle array)
   */
  protected getClearedData(): CandleData {
    return {
      coin: '',
      interval: CandlePeriod.ONE_HOUR,
      candles: [],
    };
  }

  /**
   * Disconnect all subscriptions
   */
  public disconnectAll(): void {
    this.subscribers.forEach((subscriber) => {
      if (subscriber.timer) {
        clearTimeout(subscriber.timer);
        subscriber.timer = undefined;
      }
      subscriber.pendingUpdate = undefined;
    });

    this.wsSubscriptions.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.wsSubscriptions.clear();
  }
}
