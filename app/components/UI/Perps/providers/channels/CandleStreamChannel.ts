import Engine from '../../../../../core/Engine';
import type { CandleData } from '../../types/perps-types';
import {
  CandlePeriod,
  TimeDuration,
  calculateCandleCount,
} from '../../constants/chartConfig';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';
import DevLogger from '../../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../../util/Logger';
import { ensureError } from '../../../../../util/errorUtils';

// Generic subscription parameters
interface StreamSubscription<T> {
  id: string;
  cacheKey: string; // Associated cacheKey (coin-interval) for filtering
  callback: (data: T) => void;
  throttleMs?: number;
  timer?: NodeJS.Timeout;
  pendingUpdate?: T;
  hasReceivedFirstUpdate?: boolean;
  onError?: (error: Error) => void;
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
   * Subscribe to candle updates for a specific coin and interval.
   * Note: The duration parameter is accepted for API compatibility but ignored -
   * we always fetch maximum candles (YEAR_TO_DATE = 500) to avoid complex caching issues.
   */
  public subscribe(params: {
    coin: string;
    interval: CandlePeriod;
    duration: TimeDuration;
    callback: (data: CandleData) => void;
    throttleMs?: number;
    onError?: (error: Error) => void;
  }): () => void {
    const { coin, interval, callback, throttleMs, onError } = params;
    const cacheKey = this.getCacheKey(coin, interval);
    const id = Math.random().toString(36);

    const subscription: StreamSubscription<CandleData> = {
      id,
      cacheKey,
      callback,
      throttleMs,
      hasReceivedFirstUpdate: false,
      onError,
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
          { cacheKey },
        );
        this.disconnect(cacheKey);
      }
    };
  }

  /**
   * Connect to WebSocket for specific coin and interval.
   * Always uses YEAR_TO_DATE duration to fetch maximum candles (500) on initial load.
   * This ensures all subscribers get the full dataset regardless of their individual duration needs.
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
      setTimeout(() => {
        // Verify subscription still active before reconnecting
        const hasActiveSubscribers = Array.from(this.subscribers.values()).some(
          (sub) => sub.cacheKey === cacheKey,
        );

        // Only reconnect if subscribers still exist and no connection established
        if (hasActiveSubscribers && !this.wsSubscriptions.has(cacheKey)) {
          this.connect(coin, interval, cacheKey);
        }
      }, PERPS_CONSTANTS.RECONNECTION_CLEANUP_DELAY_MS);
      return;
    }

    // Subscribe to candle updates via controller
    // Always use YEAR_TO_DATE to fetch maximum candles (500) regardless of subscriber's duration
    const unsubscribe = Engine.context.PerpsController.subscribeToCandles({
      coin,
      interval,
      duration: TimeDuration.YEAR_TO_DATE, // Always fetch max candles
      callback: (candleData: CandleData) => {
        // Update cache
        this.cache.set(cacheKey, candleData);

        // Notify all subscribers
        this.notifySubscribers(cacheKey, candleData);
      },
      onError: (error: Error) => {
        // Log initialization failure
        DevLogger.log(
          'CandleStreamChannel: Subscription initialization failed',
          {
            coin,
            interval,
            cacheKey,
            error: error.message,
          },
        );

        // Notify all subscribers for this cacheKey of the error
        const matchingSubscribers = Array.from(
          this.subscribers.values(),
        ).filter((sub) => sub.cacheKey === cacheKey);
        matchingSubscribers.forEach((subscriber) => {
          subscriber.onError?.(error);
        });

        // Clean up failed subscription
        this.wsSubscriptions.delete(cacheKey);
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
   * Disconnect from WebSocket for specific coin+interval, or all subscriptions if no cacheKey provided
   * @param cacheKey - Optional cache key for specific coin+interval. If omitted, disconnects all subscriptions.
   */
  public disconnect(cacheKey?: string): void {
    if (cacheKey === undefined) {
      // Disconnect all subscriptions
      this.disconnectAll();
      return;
    }
    // Disconnect specific subscription
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
   * Fetch additional historical candles before the current oldest candle
   * Used for loading more history when user scrolls to the left edge of the chart
   * Dynamically calculates fetch size based on duration and interval
   * @param coin - The coin symbol
   * @param interval - The candle interval
   * @param duration - The time duration (used to calculate dynamic fetch size)
   * @returns Promise that resolves when fetch completes
   */
  public async fetchHistoricalCandles(
    coin: string,
    interval: CandlePeriod,
    duration: TimeDuration,
  ): Promise<void> {
    const cacheKey = this.getCacheKey(coin, interval);
    const cachedData = this.cache.get(cacheKey);

    // If no cached data or no candles, nothing to extend
    if (!cachedData || cachedData.candles.length === 0) {
      DevLogger.log(
        'CandleStreamChannel: No cached data to extend, skipping historical fetch',
        { coin, interval },
      );
      return;
    }

    // Get the oldest candle timestamp
    const oldestCandle = cachedData.candles[0];
    if (!oldestCandle) {
      return;
    }

    const oldestTime = oldestCandle.time;
    const endTime = oldestTime - 1; // Fetch candles ending just before the oldest

    // Calculate dynamic limit based on duration and interval
    const dynamicLimit = calculateCandleCount(duration, interval);

    // Apply min/max safeguards
    const FETCH_SIZE = {
      MIN: 50, // Minimum for long intervals (1w, 1M)
      MAX: 500, // Maximum to prevent huge fetches
    };

    const limit = Math.min(
      Math.max(dynamicLimit, FETCH_SIZE.MIN),
      FETCH_SIZE.MAX,
    );

    try {
      DevLogger.log(
        'CandleStreamChannel: Fetching additional historical candles',
        { coin, interval, duration, oldestTime, endTime, dynamicLimit, limit },
      );

      // Fetch historical candles via controller
      const newCandleData =
        await Engine.context.PerpsController.fetchHistoricalCandles(
          coin,
          interval,
          limit,
          endTime,
        );

      if (!newCandleData || newCandleData.candles.length === 0) {
        DevLogger.log(
          'CandleStreamChannel: No additional historical candles available',
          { coin, interval },
        );
        return;
      }

      // Merge new candles with existing (prepend older candles)
      // Filter out duplicates based on timestamp
      const existingTimes = new Set(cachedData.candles.map((c) => c.time));
      const newUnique = newCandleData.candles.filter(
        (c) => !existingTimes.has(c.time),
      );

      // Combine and sort by time ascending
      const mergedCandles = [...newUnique, ...cachedData.candles].sort(
        (a, b) => a.time - b.time,
      );

      // Limit to max 1000 candles to prevent memory issues
      // Keep newest candles to preserve live updates
      const MAX_CANDLES = 1000;
      const finalCandles =
        mergedCandles.length > MAX_CANDLES
          ? mergedCandles.slice(-MAX_CANDLES)
          : mergedCandles;

      // Update cache with merged data
      const updatedData: CandleData = {
        coin: cachedData.coin,
        interval: cachedData.interval,
        candles: finalCandles,
      };

      this.cache.set(cacheKey, updatedData);

      // Notify all subscribers of the updated data
      this.notifySubscribers(cacheKey, updatedData);

      DevLogger.log(
        'CandleStreamChannel: Successfully fetched and merged historical candles',
        {
          coin,
          interval,
          newCandles: newUnique.length,
          totalCandles: finalCandles.length,
          oldestTime: finalCandles[0]?.time,
          newestTime: finalCandles[finalCandles.length - 1]?.time,
        },
      );
    } catch (error) {
      const errorInstance = ensureError(error);

      // Log to Sentry: fetch failures affect multiple subscribers
      Logger.error(errorInstance, {
        tags: {
          feature: PERPS_CONSTANTS.FEATURE_NAME,
          component: 'CandleStreamChannel',
        },
        context: {
          name: 'historical_candles',
          data: {
            operation: 'fetchHistoricalCandles',
            coin,
            interval,
            duration,
            cacheKey,
          },
        },
      });

      throw error;
    }
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

  /**
   * Reconnect all active subscriptions after WebSocket reconnection
   * Clears dead subscriptions and re-establishes connections for active subscribers
   */
  public reconnect(): void {
    // Get unique cache keys from subscribers before disconnecting
    const activeCacheKeys = new Set(
      Array.from(this.subscribers.values()).map((sub) => sub.cacheKey),
    );

    // Disconnect all WebSocket subscriptions (they're dead after reconnection)
    // Using disconnect() without args to call disconnectAll() internally
    this.disconnect();

    // Re-establish connections for each active cache key
    activeCacheKeys.forEach((cacheKey) => {
      // Parse coin and interval from cacheKey (format: "coin-interval")
      // Since coin symbols can contain hyphens (e.g., "ETH-USD"), we need to
      // split from the right. The interval is always the last segment after the final hyphen.
      const lastHyphenIndex = cacheKey.lastIndexOf('-');
      if (lastHyphenIndex === -1 || lastHyphenIndex === 0) {
        // Invalid cache key format - skip
        return;
      }
      const coin = cacheKey.substring(0, lastHyphenIndex);
      const interval = cacheKey.substring(lastHyphenIndex + 1);
      if (coin && interval) {
        this.connect(coin, interval as CandlePeriod, cacheKey);
      }
    });
  }
}
