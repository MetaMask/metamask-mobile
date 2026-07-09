import React, { createContext, useContext } from 'react';
import { v4 as uuidv4 } from 'uuid';
import performance from 'react-native-performance';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import PerpsConnectionManager from '../services/PerpsConnectionManager';
import {
  PERFORMANCE_CONFIG,
  PERPS_CONSTANTS,
  PerpsMeasurementName,
  type PriceUpdate,
  type Position,
  type Order,
  type OrderFill,
  type AccountState,
  type PerpsMarketData,
  findEvmAccount,
} from '@metamask/perps-controller';
import { store } from '../../../../store';
import { selectPerpsTerminalBackendEnabledFlag } from '../selectors/featureFlags';
import {
  PROVIDER_CONFIG,
  PERPS_DISK_CACHE_MARKETS,
  PERPS_DISK_CACHE_USER_DATA,
  PERPS_DISK_CACHE_THROTTLE_MS,
} from '../constants/perpsConfig';
import {
  buildMarketDataPayload,
  buildUserDataPayload,
} from '@metamask/perps-controller/utils/perpsDiskPersistence';
import {
  buildProviderCacheKey,
  getProviderNetworkKey,
} from '@metamask/perps-controller/constants/perpsConfig';
import StorageWrapper from '../../../../store/storage-wrapper';
import { getE2EMockStreamManager } from '../utils/e2eBridgePerps';
import {
  handlePerpsCufPositionsDelivered,
  handlePerpsCufOrdersDelivered,
} from '../utils/perpsCufTrace';
import { CandleStreamChannel } from './channels/CandleStreamChannel';
import { getPreloadedData } from '../hooks/stream/hasCachedPerpsData';
import { InternalAccount } from '@metamask/keyring-internal-api';

/**
 * Gets the EVM account from the selected account group.
 * Mobile-specific helper using Engine context.
 * @returns EVM account or null if not found
 */
function getEvmAccountFromSelectedAccountGroup() {
  const { AccountTreeController } = Engine.context;
  const accounts = AccountTreeController.getAccountsFromSelectedAccountGroup();
  return findEvmAccount(accounts as InternalAccount[]);
}

// Generic subscription parameters
interface StreamSubscription<T> {
  id: string;
  callback: (data: T) => void;
  throttleMs?: number;
  timer?: NodeJS.Timeout;
  pendingUpdate?: T;
  hasReceivedFirstUpdate?: boolean; // Track if subscriber has received first update
  // Symbols this subscriber cares about. When present, the channel can dispatch
  // an update only to subscribers registered for the symbols that changed,
  // instead of iterating every subscriber on every tick. Used by the price channel.
  symbols?: string[];
}

// Base class for any stream type
abstract class StreamChannel<T> {
  protected cache = new Map<string, T>();
  protected subscribers = new Map<string, StreamSubscription<T>>();
  // Reverse index: symbol -> set of subscriber ids registered for that symbol.
  // Populated only for subscriptions that declare `symbols` (the price channel),
  // so symbol-scoped channels can dispatch a tick to just the relevant
  // subscribers. Channels without symbol subscriptions never touch this map.
  protected readonly symbolSubscribers = new Map<string, Set<string>>();
  protected wsSubscription: (() => void) | null = null;
  readonly #onDataPersist?: () => void;

  constructor(onDataPersist?: () => void) {
    this.#onDataPersist = onDataPersist;
  }

  protected triggerPersist(): void {
    this.#onDataPersist?.();
  }
  // Track account context to prevent stale data across account switches
  protected accountAddress: string | null = null;
  // Track WebSocket connection timing for first data measurement
  protected wsConnectionStartTime: number | null = null;
  // Reference count for pause requests. Emission is blocked whenever > 0,
  // allowing independent callers (tab visibility, controller operations) to
  // pause/resume without clobbering each other.
  protected pauseCount = 0;
  // Wall-clock instant of the most recent real delivery to subscribers (unset
  // while paused, since nothing rendered). Lets a caller that reads getSnapshot()
  // attribute an already-present value to the instant it was delivered rather
  // than to when the caller happened to look.
  protected lastDeliveredAt: number | null = null;
  // Retry counter for deferred connect() calls
  protected connectRetryCount = 0;
  // Timer handle for deferConnect so it can be cancelled on disconnect
  protected deferConnectTimer: ReturnType<typeof setTimeout> | null = null;
  private static readonly MAX_CONNECT_RETRIES = 150; // 30s at 200ms

  protected notifySubscribers(updates: T) {
    // Block emission while any pause is held (WebSocket continues receiving updates)
    if (this.pauseCount > 0) {
      return;
    }

    this.lastDeliveredAt = Date.now();
    this.subscribers.forEach((subscriber) => {
      this.deliverToSubscriber(subscriber, updates);
    });
  }

  /**
   * Wall-clock instant of the most recent real delivery on this channel, or null
   * if nothing has been delivered (or the channel is paused). Used to timestamp a
   * CUF span end at the delivery instant when the confirming value was already
   * present by the time the caller checked getSnapshot().
   *
   * Granularity is per-channel, not per-symbol: on a full-snapshot channel like
   * positions (which re-delivers all symbols on any PnL tick) this is effectively
   * "the last tick", so it upper-bounds an individual symbol's change instant
   * rather than pinpointing it. The bound is always >= the span start and <= now,
   * so a span end using it is bounded and never optimistic — it can only slightly
   * over-measure, never under-measure. Callers needing the exact per-symbol change
   * instant should observe the live delivery (as the normal watcher path does),
   * not read this after the fact.
   */
  public getLastDeliveredAt(): number | null {
    return this.lastDeliveredAt;
  }

  /**
   * Symbol-scoped variant of {@link notifySubscribers}. Only subscribers that
   * registered for at least one of `changedSymbols` are notified, so a tick that
   * carries a subset of symbols does not iterate (or allocate filtered payloads
   * for) subscribers that don't care about it. Each notified subscriber receives
   * the exact same `updates` payload it would via notifySubscribers, so its own
   * filtering wrapper still produces the correct slice. First-update and throttle
   * semantics are identical because delivery goes through the shared
   * {@link deliverToSubscriber}.
   */
  protected notifySubscribersForSymbols(
    updates: T,
    changedSymbols: Iterable<string>,
  ) {
    // Block emission while any pause is held (WebSocket continues receiving updates)
    if (this.pauseCount > 0) {
      return;
    }

    this.lastDeliveredAt = Date.now();
    // A subscriber registered for multiple changed symbols must be delivered to
    // exactly once per tick (not once per matching symbol).
    const notifiedIds = new Set<string>();
    for (const symbol of changedSymbols) {
      const ids = this.symbolSubscribers.get(symbol);
      if (!ids) {
        continue;
      }
      ids.forEach((id) => {
        if (notifiedIds.has(id)) {
          return;
        }
        const subscriber = this.subscribers.get(id);
        if (!subscriber) {
          return;
        }
        notifiedIds.add(id);
        this.deliverToSubscriber(subscriber, updates);
      });
    }
  }

  /**
   * Deliver a single update to one subscriber, applying first-update and throttle
   * semantics. Shared by {@link notifySubscribers} and
   * {@link notifySubscribersForSymbols} so both dispatch paths behave identically.
   */
  private deliverToSubscriber(subscriber: StreamSubscription<T>, updates: T) {
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

    // Throttle pattern: Only set timer if one isn't already running
    // This ensures callbacks fire at most once per throttleMs interval
    // WITHOUT resetting the countdown on every update (which would be debouncing)
    // The conditional check prevents timer accumulation - no memory leaks
    subscriber.timer ??= setTimeout(() => {
      if (subscriber.pendingUpdate) {
        subscriber.callback(subscriber.pendingUpdate);
        subscriber.pendingUpdate = undefined;
      }
      subscriber.timer = undefined;
    }, subscriber.throttleMs);
  }

  /**
   * Immediately deliver any throttled subscriber's pending update, cancelling
   * its timer. Used to close CUF confirmations at the instant subscribers
   * actually render, instead of up to a throttle interval later.
   *
   * This is a deliberate throttle bypass, invoked ONLY when a CUF matcher
   * confirms on a delivery (not on every tick), so the measured render instant
   * reflects real subscriber delivery. The affected subscribers simply receive
   * their already-pending update slightly early; no extra work is scheduled.
   */
  public flushThrottledDeliveries() {
    this.subscribers.forEach((subscriber) => {
      if (!subscriber.timer) {
        return;
      }
      clearTimeout(subscriber.timer);
      subscriber.timer = undefined;
      if (subscriber.pendingUpdate !== undefined) {
        subscriber.callback(subscriber.pendingUpdate);
        subscriber.pendingUpdate = undefined;
      }
    });
  }

  /**
   * Register a subscription's symbols into the reverse index so symbol-scoped
   * dispatch can find it. No-op for subscriptions without symbols.
   */
  private indexSubscriptionSymbols(subscription: StreamSubscription<T>) {
    const { symbols } = subscription;
    if (!symbols) {
      return;
    }
    symbols.forEach((symbol) => {
      let ids = this.symbolSubscribers.get(symbol);
      if (!ids) {
        ids = new Set<string>();
        this.symbolSubscribers.set(symbol, ids);
      }
      ids.add(subscription.id);
    });
  }

  /**
   * Remove a subscription's symbols from the reverse index, pruning empty sets.
   */
  private deindexSubscriptionSymbols(subscription?: StreamSubscription<T>) {
    const symbols = subscription?.symbols;
    if (!subscription || !symbols) {
      return;
    }
    symbols.forEach((symbol) => {
      const ids = this.symbolSubscribers.get(symbol);
      if (!ids) {
        return;
      }
      ids.delete(subscription.id);
      if (ids.size === 0) {
        this.symbolSubscribers.delete(symbol);
      }
    });
  }

  subscribe(params: {
    callback: (data: T) => void;
    throttleMs?: number;
    symbols?: string[];
  }): () => void {
    const id = Math.random().toString(36);

    const subscription: StreamSubscription<T> = {
      id,
      ...params,
      hasReceivedFirstUpdate: false, // Initialize as false
    };
    this.subscribers.set(id, subscription);
    this.indexSubscriptionSymbols(subscription);

    // Give immediate cached data if available
    const cached = this.getCachedData();
    if (cached != null) {
      params.callback(cached);
      // Mark as having received first update since we provided cached data
      subscription.hasReceivedFirstUpdate = true;
    }

    // Ensure WebSocket connected
    this.connect();

    // Return unsubscribe function
    return () => {
      const sub = this.subscribers.get(id);
      if (sub?.timer) {
        clearTimeout(sub.timer);
        sub.timer = undefined;
      }
      this.deindexSubscriptionSymbols(sub);
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

  /**
   * Schedule a deferred connect() retry with safety checks.
   * Aborts if no subscribers remain or max retries exceeded.
   */
  protected deferConnect(delayMs: number): void {
    if (this.subscribers.size === 0) {
      this.connectRetryCount = 0;
      return;
    }

    if (this.connectRetryCount >= StreamChannel.MAX_CONNECT_RETRIES) {
      DevLogger.log(
        `${this.constructor.name}: Max connect retries exceeded (${StreamChannel.MAX_CONNECT_RETRIES}), giving up`,
      );
      this.connectRetryCount = 0;
      return;
    }

    this.connectRetryCount++;
    if (this.deferConnectTimer) {
      clearTimeout(this.deferConnectTimer);
    }
    this.deferConnectTimer = setTimeout(() => {
      this.deferConnectTimer = null;
      this.connect();
    }, delayMs);
  }

  /**
   * Common initialization guard for connect().
   * Returns true if the channel is ready to connect, false if deferred.
   * Resets connectRetryCount on success.
   *
   * When the connection manager is actively connecting, awaits the connection
   * promise and retries connect() once resolved, instead of blind 200ms polling.
   */
  protected ensureReady(): boolean {
    if (Engine.context.PerpsController.isCurrentlyReinitializing()) {
      this.deferConnect(PERPS_CONSTANTS.ReconnectionCleanupDelayMs);
      return false;
    }
    const connState = PerpsConnectionManager.getConnectionState();
    if (!connState.isInitialized) {
      // If actively connecting, await the connection promise instead of polling
      if (connState.isConnecting) {
        DevLogger.log(
          `${this.constructor.name}: ensureReady: awaiting active connection`,
        );
        this.awaitConnectionThenConnect();
        return false;
      }
      this.deferConnect(PERPS_CONSTANTS.ConnectRetryDelayMs);
      return false;
    }
    this.connectRetryCount = 0;
    return true;
  }

  /**
   * Await the PerpsConnectionManager connection promise, then retry connect().
   * This replaces blind 200ms polling when we know a connection is in progress.
   */
  private awaitConnectionThenConnect(): void {
    // Prevent duplicate awaits — only one outstanding wait at a time
    if (this.deferConnectTimer) {
      return;
    }
    // Use a sentinel timer value to signal that we're waiting on the promise
    // This prevents deferConnect from also scheduling a parallel timer
    const noop = () => {
      /* sentinel timer */
    };
    const sentinel = setTimeout(noop, 0);
    this.deferConnectTimer = sentinel;

    PerpsConnectionManager.waitForConnection()
      .then(() => {
        // Only clear if our sentinel is still the active timer; a disconnect()
        // followed by a new subscribe() may have replaced it with a real timer.
        if (this.deferConnectTimer === sentinel) {
          this.deferConnectTimer = null;
        }
        if (this.subscribers.size > 0) {
          this.connect();
        }
      })
      .catch(() => {
        if (this.deferConnectTimer === sentinel) {
          this.deferConnectTimer = null;
        }
        // Connection failed — fall back to normal defer polling
        if (this.subscribers.size > 0) {
          DevLogger.log(
            `${this.constructor.name}: awaitConnectionThenConnect: connection failed, falling back to polling`,
          );
          this.deferConnect(PERPS_CONSTANTS.ConnectRetryDelayMs);
        }
      });
  }

  /**
   * Reconnect the channel after WebSocket reconnection
   * Clears dead subscription and re-establishes if there are active subscribers
   */
  public reconnect() {
    this.disconnect();
    // Re-establish connection if there are active subscribers
    if (this.subscribers.size > 0) {
      this.connect();
    }
  }

  public disconnect() {
    this.connectRetryCount = 0;
    if (this.deferConnectTimer) {
      clearTimeout(this.deferConnectTimer);
      this.deferConnectTimer = null;
    }
    // This prevents orphaned timers from continuing to run after disconnect
    this.subscribers.forEach((subscriber) => {
      if (subscriber.timer) {
        clearTimeout(subscriber.timer);
        subscriber.timer = undefined;
      }
      subscriber.pendingUpdate = undefined;
    });

    if (this.wsSubscription) {
      this.wsSubscription();
      this.wsSubscription = null;
    }
    this.accountAddress = null;
    // End any first-data trace still open (disconnected before first data), so
    // it isn't left running until the 5-minute auto-clean as a bogus long span.
    this.endOpenFirstDataTrace();
    this.wsConnectionStartTime = null;
  }

  /**
   * End a first-data ("time to first ...") trace left open at disconnect.
   * No-op in the base; channels that start such a trace override this.
   */
  protected endOpenFirstDataTrace(): void {
    // Overridden by channels with a first-data trace.
  }

  /**
   * Pause emission of updates to subscribers
   * WebSocket connection stays alive and continues receiving data
   * Used during batch operations to prevent UI re-renders from stale data
   */
  public pause(): void {
    this.pauseCount += 1;
  }

  /**
   * Resume emission of updates to subscribers.
   * Each pause() call must be matched by exactly one resume(). Emission
   * resumes only when all callers have released their pause.
   */
  public resume(): void {
    this.pauseCount = Math.max(0, this.pauseCount - 1);
  }

  protected getCachedData(): T | null {
    // Override in subclasses to return null for no cache, or actual data
    return null;
  }

  public clearCache(): void {
    // End any first-data trace still open, so clearing the cache before first
    // data doesn't leave a span running until the 5-minute auto-clean.
    this.endOpenFirstDataTrace();
    // This ensures no timers are orphaned during the disconnect/reconnect cycle
    this.subscribers.forEach((subscriber) => {
      // Clear any pending updates and timers
      if (subscriber.timer) {
        clearTimeout(subscriber.timer);
        subscriber.timer = undefined;
      }
      subscriber.pendingUpdate = undefined;
      subscriber.hasReceivedFirstUpdate = false;
    });

    // Disconnect the old WebSocket subscription to stop receiving old account data
    if (this.wsSubscription) {
      this.disconnect();
    }

    // Reset account context immediately
    this.accountAddress = null;
    this.wsConnectionStartTime = null;

    // Clear the cache
    this.cache.clear();

    // Notify subscribers with cleared data to trigger loading state
    // Using getClearedData() ensures type safety while maintaining loading semantics
    this.subscribers.forEach((subscriber) => {
      // Send cleared data to indicate "no data yet" (loading state)
      subscriber.callback(this.getClearedData());
    });

    // If we have active subscribers, they'll trigger reconnect in their next render
    // The connect() call will create a new WebSocket with the new account
  }

  protected abstract getClearedData(): T;

  public abstract getSnapshot(): T | null;
}

// Specific channel for prices
class PriceStreamChannel extends StreamChannel<Record<string, PriceUpdate>> {
  private readonly symbols = new Set<string>();
  private prewarmUnsubscribe?: () => void;
  private actualPriceUnsubscribe?: () => void;
  private firstDataTraceId?: string;

  protected endOpenFirstDataTrace(): void {
    if (this.firstDataTraceId) {
      endTrace({
        name: TraceName.PerpsWebSocketFirstPrice,
        id: this.firstDataTraceId,
        data: { success: false, reason: 'disconnected' },
      });
      this.firstDataTraceId = undefined;
    }
  }

  private allMarketSymbols: string[] = [];
  // Unique ID per prewarm cycle to detect stale promises and prevent subscription leaks
  private prewarmCycleId: number = 0;
  // Override cache to store individual PriceUpdate objects
  protected priceCache = new Map<string, PriceUpdate>();

  /**
   * Maps a raw price update to the cached PriceUpdate shape, stamping the
   * receive time and applying backward-compatible defaults.
   *
   * Backward-compatible default for `isTradable`: pre-8.3.0 streams don't
   * emit the field, so treat absence as tradable to avoid breaking existing
   * market display.
   */
  private toPriceUpdate(update: PriceUpdate): PriceUpdate {
    return {
      symbol: update.symbol,
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
      isTradable: update.isTradable ?? true,
    };
  }

  protected connect() {
    if (this.wsSubscription) {
      return;
    }

    if (!this.ensureReady()) return;

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

    // Start trace for first price measurement (before subscription)
    this.firstDataTraceId = uuidv4();
    trace({
      name: TraceName.PerpsWebSocketFirstPrice,
      id: this.firstDataTraceId,
      op: TraceOperation.PerpsOperation,
    });
    this.wsConnectionStartTime = performance.now();

    this.wsSubscription = Engine.context.PerpsController.subscribeToPrices({
      symbols: allSymbols,
      callback: (updates: PriceUpdate[]) => {
        // Track first price data from WebSocket (only once per connection)
        if (this.wsConnectionStartTime !== null && this.firstDataTraceId) {
          const firstDataDuration =
            performance.now() - this.wsConnectionStartTime;
          DevLogger.log(
            `${PERFORMANCE_CONFIG.LoggingMarkers.WebsocketPerformance} PerpsWS: First price data received`,
            { duration: `${firstDataDuration.toFixed(0)}ms` },
          );
          endTrace({
            name: TraceName.PerpsWebSocketFirstPrice,
            id: this.firstDataTraceId,
            data: { success: true, duration: firstDataDuration },
          });
          this.wsConnectionStartTime = null;
          this.firstDataTraceId = undefined;
        }

        // Update cache and build price map
        const priceMap: Record<string, PriceUpdate> = {};
        updates.forEach((update) => {
          const priceUpdate = this.toPriceUpdate(update);
          this.priceCache.set(update.symbol, priceUpdate);
          priceMap[update.symbol] = priceUpdate;
        });

        // Scope dispatch to subscribers registered for the symbols in this tick.
        this.notifySubscribersForSymbols(priceMap, Object.keys(priceMap));
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

  public getSnapshot(): Record<string, PriceUpdate> | null {
    return this.getCachedData();
  }

  public clearCache(): void {
    // Clear the price-specific cache
    this.priceCache.clear();
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // Call parent clearCache
    super.clearCache();
  }

  public reconnect(): void {
    const shouldRestorePrewarm = Boolean(this.prewarmUnsubscribe);

    if (shouldRestorePrewarm) {
      this.cleanupPrewarm();
    }

    super.reconnect();

    if (shouldRestorePrewarm) {
      this.prewarm().catch((error) => {
        Logger.error(ensureError(error, 'PriceStreamChannel.reconnect'), {
          context: 'PriceStreamChannel.reconnect',
        });
      });
    }
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
      // Registering symbols lets the channel scope dispatch to only the
      // subscribers interested in the symbols present in a given tick.
      symbols: params.symbols,
      callback: (allPrices) => {
        // Filter to only requested symbols
        const filtered: Record<string, PriceUpdate> = {};
        params.symbols.forEach((symbol) => {
          if (allPrices?.[symbol]) {
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
   * Non-blocking: Returns immediately while market fetch happens in background
   * @returns Cleanup function to call when leaving Perps environment
   */
  public async prewarm(): Promise<() => void> {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('PriceStreamChannel: Already pre-warmed');
      return this.prewarmUnsubscribe;
    }

    const controller = Engine.context.PerpsController;
    if (!controller) return () => undefined;

    // Increment cycle ID to detect stale promises from previous prewarm cycles
    // This prevents subscription leaks when user navigates: Perps → away → back quickly
    this.prewarmCycleId++;
    const currentCycleId = this.prewarmCycleId;

    // Start market fetch in background (non-blocking)
    // We need the symbols to register subscribers, but we can return immediately
    controller
      .getMarkets({
        useTerminalApi: selectPerpsTerminalBackendEnabledFlag(store.getState()),
      })
      .then((markets) => {
        // If this promise is from a stale cycle, don't set up subscription
        // This prevents leaks when prewarm is called multiple times rapidly
        if (currentCycleId !== this.prewarmCycleId) {
          DevLogger.log('PriceStreamChannel: Skipping stale prewarm cycle', {
            currentCycleId,
            activeCycleId: this.prewarmCycleId,
          });
          return;
        }

        // If already cleaned up, don't set up subscription
        if (this.prewarmUnsubscribe === undefined) {
          return;
        }

        this.allMarketSymbols = markets.map((market) => market.name);

        DevLogger.log(
          'PriceStreamChannel: Pre-warming with all market symbols',
          {
            symbolCount: this.allMarketSymbols.length,
            symbols: this.allMarketSymbols.slice(0, 10),
          },
        );

        // Start trace for first price measurement (prewarm is the usual
        // price subscription path; connect() covers the no-prewarm case)
        this.firstDataTraceId = uuidv4();
        trace({
          name: TraceName.PerpsWebSocketFirstPrice,
          id: this.firstDataTraceId,
          op: TraceOperation.PerpsOperation,
        });
        this.wsConnectionStartTime = performance.now();

        // WARNING: Do NOT set includeMarketData: true here. It triggers
        // per-symbol activeAssetCtx subscriptions (N symbols × N DEXs = N²
        // WebSocket connections). assetCtxs (1 per DEX) is always established
        // by the subscription service regardless of this flag.
        const unsub = controller.subscribeToPrices({
          symbols: this.allMarketSymbols,
          includeMarketData: false,
          callback: (updates: PriceUpdate[]) => {
            // Track first price data from WebSocket (only once per prewarm)
            if (this.wsConnectionStartTime !== null && this.firstDataTraceId) {
              const firstDataDuration =
                performance.now() - this.wsConnectionStartTime;
              DevLogger.log(
                `${PERFORMANCE_CONFIG.LoggingMarkers.WebsocketPerformance} PerpsWS: First price data received`,
                { duration: `${firstDataDuration.toFixed(0)}ms` },
              );
              endTrace({
                name: TraceName.PerpsWebSocketFirstPrice,
                id: this.firstDataTraceId,
                data: { success: true, duration: firstDataDuration },
              });
              this.wsConnectionStartTime = null;
              this.firstDataTraceId = undefined;
            }

            const priceMap: Record<string, PriceUpdate> = {};
            updates.forEach((update) => {
              const priceUpdate = this.toPriceUpdate(update);
              this.priceCache.set(update.symbol, priceUpdate);
              priceMap[update.symbol] = priceUpdate;
            });

            if (this.subscribers.size > 0) {
              // Scope dispatch to subscribers registered for the symbols in this tick.
              this.notifySubscribersForSymbols(priceMap, Object.keys(priceMap));
            }
          },
        });

        // Store the actual unsubscribe function
        this.actualPriceUnsubscribe = unsub;

        if (this.wsSubscription) {
          this.wsSubscription();
          this.wsSubscription = null;
        }
      })
      .catch((error) => {
        Logger.error(
          ensureError(error, 'PriceStreamChannel.prewarm.backgroundFetch'),
          {
            context: 'PriceStreamChannel.prewarm.backgroundFetch',
          },
        );
        // Reset state so subsequent prewarm/connect calls can recover
        this.prewarmUnsubscribe = undefined;
        this.allMarketSymbols = [];
        // Reconnect waiting subscribers that were skipped because prewarm was pending
        if (this.subscribers.size > 0) {
          this.connect();
        }
      });

    // Return cleanup function immediately (before markets load)
    this.prewarmUnsubscribe = () => {
      DevLogger.log('PriceStreamChannel: Cleaning up prewarm subscription');
      this.cleanupPrewarm();
    };

    return this.prewarmUnsubscribe;
  }

  /**
   * Cleanup pre-warm subscription
   */
  public cleanupPrewarm(): void {
    // Prewarm starts the first-price trace; end it here too so a soft reconnect
    // (preserveCaches: true skips clearCache) doesn't leave it open to be
    // overwritten by the next prewarm.
    this.endOpenFirstDataTrace();
    if (this.actualPriceUnsubscribe) {
      this.actualPriceUnsubscribe();
      this.actualPriceUnsubscribe = undefined;
    }
    this.prewarmUnsubscribe = undefined;
    this.allMarketSymbols = [];
  }
}

// Specific channel for orders (null = cleared on account switch; hooks show skeleton until next update)
class OrderStreamChannel extends StreamChannel<Order[] | null> {
  private prewarmUnsubscribe?: () => void;
  private firstDataTraceId?: string;

  protected endOpenFirstDataTrace(): void {
    if (this.firstDataTraceId) {
      endTrace({
        name: TraceName.PerpsWebSocketFirstOrders,
        id: this.firstDataTraceId,
        data: { success: false, reason: 'disconnected' },
      });
      this.firstDataTraceId = undefined;
    }
  }

  protected connect() {
    if (this.wsSubscription) return;

    if (!this.ensureReady()) return;

    // Start trace for first data measurement (before subscription)
    this.firstDataTraceId = uuidv4();
    trace({
      name: TraceName.PerpsWebSocketFirstOrders,
      id: this.firstDataTraceId,
      op: TraceOperation.PerpsOperation,
    });

    // Track WebSocket connection start time for duration calculation
    this.wsConnectionStartTime = performance.now();

    this.wsSubscription = Engine.context.PerpsController.subscribeToOrders({
      callback: (orders: Order[]) => {
        // Validate account context
        const currentAccount =
          getEvmAccountFromSelectedAccountGroup()?.address || null;
        if (this.accountAddress && this.accountAddress !== currentAccount) {
          Logger.error(new Error('OrderStreamChannel: Wrong account context'), {
            expected: currentAccount,
            received: this.accountAddress,
          });
          return;
        }
        this.accountAddress = currentAccount;

        // Track first order data from WebSocket (only once per connection)
        if (this.wsConnectionStartTime !== null && this.firstDataTraceId) {
          const firstDataDuration =
            performance.now() - this.wsConnectionStartTime;

          // Log WebSocket performance measurement
          DevLogger.log(
            `${PERFORMANCE_CONFIG.LoggingMarkers.WebsocketPerformance} PerpsWS: First order data received`,
            {
              duration: `${firstDataDuration.toFixed(0)}ms`,
            },
          );

          // End trace with accurate duration
          endTrace({
            name: TraceName.PerpsWebSocketFirstOrders,
            id: this.firstDataTraceId,
            data: {
              success: true,
              duration: firstDataDuration,
            },
          });

          this.wsConnectionStartTime = null;
          this.firstDataTraceId = undefined;
        }

        this.cache.set('orders', orders);
        this.notifySubscribers(orders);
        // Orders just rendered to subscribers — close pending cancel / limit
        // order-render CUF spans, flushing throttled subscribers first so the
        // span ends when they actually render, not at throttle-enqueue time.
        // Skip while paused: notifySubscribers delivered nothing, so nothing
        // rendered.
        if (this.pauseCount === 0) {
          handlePerpsCufOrdersDelivered(orders, () =>
            this.flushThrottledDeliveries(),
          );
        }
        this.triggerPersist();
      },
    });
  }

  protected getCachedData() {
    const cached = this.cache.get('orders');
    if (cached !== undefined) {
      return cached;
    }
    const preloaded = getPreloadedData<Order[]>('cachedOrders');
    return preloaded;
  }

  protected getClearedData(): Order[] | null {
    return null;
  }

  public getSnapshot() {
    return this.cache.get('orders') ?? null;
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

  public disconnect() {
    // End (not just drop) any open first-data trace before the base teardown.
    this.endOpenFirstDataTrace();
    super.disconnect();
  }

  public clearCache(): void {
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // End (not just drop) any open first-data trace before the base teardown.
    this.endOpenFirstDataTrace();
    // Call parent clearCache
    super.clearCache();
  }
}

// Specific channel for positions (null = cleared on account switch; hooks show skeleton until next update)
class PositionStreamChannel extends StreamChannel<Position[] | null> {
  private prewarmUnsubscribe?: () => void;
  private firstDataTraceId?: string;

  protected endOpenFirstDataTrace(): void {
    if (this.firstDataTraceId) {
      endTrace({
        name: TraceName.PerpsWebSocketFirstPositions,
        id: this.firstDataTraceId,
        data: { success: false, reason: 'disconnected' },
      });
      this.firstDataTraceId = undefined;
    }
  }

  protected connect() {
    if (this.wsSubscription) return;

    if (!this.ensureReady()) return;

    // Start trace for first data measurement (before subscription)
    this.firstDataTraceId = uuidv4();
    trace({
      name: TraceName.PerpsWebSocketFirstPositions,
      id: this.firstDataTraceId,
      op: TraceOperation.PerpsOperation,
    });

    // Track WebSocket connection start time for duration calculation
    this.wsConnectionStartTime = performance.now();

    this.wsSubscription = Engine.context.PerpsController.subscribeToPositions({
      callback: (positions: Position[]) => {
        // Validate account context
        const currentAccount =
          getEvmAccountFromSelectedAccountGroup()?.address || null;
        if (this.accountAddress && this.accountAddress !== currentAccount) {
          Logger.error(
            new Error('PositionStreamChannel: Wrong account context'),
            {
              expected: currentAccount,
              received: this.accountAddress,
            },
          );
          return;
        }
        this.accountAddress = currentAccount;

        // Track first position data from WebSocket (only once per connection)
        if (this.wsConnectionStartTime !== null && this.firstDataTraceId) {
          const firstDataDuration =
            performance.now() - this.wsConnectionStartTime;

          // Log WebSocket performance measurement
          DevLogger.log(
            `${PERFORMANCE_CONFIG.LoggingMarkers.WebsocketPerformance} PerpsWS: First position data received`,
            {
              metric: PerpsMeasurementName.PerpsWebsocketFirstPositionData,
              duration: `${firstDataDuration.toFixed(0)}ms`,
            },
          );

          // End trace with accurate duration
          endTrace({
            name: TraceName.PerpsWebSocketFirstPositions,
            id: this.firstDataTraceId,
            data: {
              success: true,
              duration: firstDataDuration,
            },
          });

          this.wsConnectionStartTime = null;
          this.firstDataTraceId = undefined;
        }

        this.cache.set('positions', positions);
        this.notifySubscribers(positions);
        // Positions just rendered to subscribers — close any pending CUF span
        // (place/close/TPSL/reconnect) at its user-perceived boundary, flushing
        // throttled subscribers first so the span ends at real render time.
        // Skip while paused: notifySubscribers delivered nothing.
        if (this.pauseCount === 0) {
          handlePerpsCufPositionsDelivered(positions, () =>
            this.flushThrottledDeliveries(),
          );
        }
        this.triggerPersist();
      },
    });
  }

  protected getCachedData() {
    const cached = this.cache.get('positions');
    if (cached !== undefined) {
      return cached;
    }
    const preloaded = getPreloadedData<Position[]>('cachedPositions');
    return preloaded;
  }

  protected getClearedData(): Position[] | null {
    return null;
  }

  public getSnapshot() {
    return this.cache.get('positions') ?? null;
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

  public disconnect() {
    // End (not just drop) any open first-data trace before the base teardown.
    this.endOpenFirstDataTrace();
    super.disconnect();
  }

  public clearCache(): void {
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // End (not just drop) any open first-data trace before the base teardown.
    this.endOpenFirstDataTrace();
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

  /**
   * Apply optimistic update for TP/SL prices to a position
   * This immediately updates the UI before WebSocket confirms the change
   * @param coin - The coin/asset symbol
   * @param takeProfitPrice - The new take profit price (undefined to remove)
   * @param stopLossPrice - The new stop loss price (undefined to remove)
   */
  public updatePositionTPSLOptimistic(
    coin: string,
    takeProfitPrice: string | undefined,
    stopLossPrice: string | undefined,
  ): void {
    const cachedPositions = this.cache.get('positions');
    if (!cachedPositions) {
      DevLogger.log(
        'PositionStreamChannel: Cannot apply optimistic update - no cached positions',
      );
      return;
    }

    const positionIndex = cachedPositions.findIndex((p) => p.symbol === coin);
    if (positionIndex === -1) {
      DevLogger.log(
        `PositionStreamChannel: Cannot apply optimistic update - position not found for ${coin}`,
      );
      return;
    }

    // Create updated positions array with the optimistic TP/SL values
    const updatedPositions = cachedPositions.map((position, index) => {
      if (index === positionIndex) {
        return {
          ...position,
          takeProfitPrice,
          stopLossPrice,
          // Update counts based on whether TP/SL is set
          takeProfitCount: takeProfitPrice ? 1 : 0,
          stopLossCount: stopLossPrice ? 1 : 0,
        };
      }
      return position;
    });

    DevLogger.log('PositionStreamChannel: Applying optimistic TP/SL update', {
      coin,
      takeProfitPrice,
      stopLossPrice,
    });

    // Update cache and notify subscribers immediately
    this.cache.set('positions', updatedPositions);
    this.notifySubscribers(updatedPositions);
  }
}

// Specific channel for fills
class FillStreamChannel extends StreamChannel<OrderFill[]> {
  private prewarmUnsubscribe?: () => void;

  protected connect() {
    if (this.wsSubscription) return;

    if (!this.ensureReady()) return;

    this.wsSubscription = Engine.context.PerpsController.subscribeToOrderFills({
      callback: (fills: OrderFill[], isSnapshot?: boolean) => {
        let updated: OrderFill[];
        if (isSnapshot) {
          // Snapshot: replace cache with initial historical data
          // Sort by timestamp descending (newest first)
          updated = [...fills]
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, 100);
        } else {
          // Streaming: prepend new fills to existing (newest first)
          const existing = this.cache.get('fills') || [];
          // New fills go at the beginning since they're most recent
          updated = [...fills, ...existing].slice(0, 100);
        }
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

  public getSnapshot(): OrderFill[] | null {
    return this.cache.get('fills') ?? null;
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches fills data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('FillStreamChannel: Already pre-warmed');
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
      DevLogger.log('FillStreamChannel: Cleaning up prewarm subscription');
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

// Specific channel for account state
class AccountStreamChannel extends StreamChannel<AccountState | null> {
  private prewarmUnsubscribe?: () => void;
  private firstDataTraceId?: string;

  protected endOpenFirstDataTrace(): void {
    if (this.firstDataTraceId) {
      endTrace({
        name: TraceName.PerpsWebSocketFirstAccount,
        id: this.firstDataTraceId,
        data: { success: false, reason: 'disconnected' },
      });
      this.firstDataTraceId = undefined;
    }
  }

  protected connect() {
    if (this.wsSubscription) return;

    if (!this.ensureReady()) return;

    // Start trace for first data measurement (before subscription)
    this.firstDataTraceId = uuidv4();
    trace({
      name: TraceName.PerpsWebSocketFirstAccount,
      id: this.firstDataTraceId,
      op: TraceOperation.PerpsOperation,
    });

    // Track WebSocket connection start time for duration calculation
    this.wsConnectionStartTime = performance.now();

    this.wsSubscription = Engine.context.PerpsController.subscribeToAccount({
      callback: (account: AccountState | null) => {
        // Validate account context
        const currentAccount =
          getEvmAccountFromSelectedAccountGroup()?.address || null;
        if (this.accountAddress && this.accountAddress !== currentAccount) {
          Logger.error(
            new Error('AccountStreamChannel: Wrong account context'),
            {
              expected: currentAccount,
              received: this.accountAddress,
            },
          );
          return;
        }
        this.accountAddress = currentAccount;

        // Track first account data from WebSocket (only once per connection)
        if (this.wsConnectionStartTime !== null && this.firstDataTraceId) {
          const firstDataDuration =
            performance.now() - this.wsConnectionStartTime;

          // Log WebSocket performance measurement
          DevLogger.log(
            `${PERFORMANCE_CONFIG.LoggingMarkers.WebsocketPerformance} PerpsWS: First account data received`,
            {
              duration: `${firstDataDuration.toFixed(0)}ms`,
            },
          );

          // End trace with accurate duration
          endTrace({
            name: TraceName.PerpsWebSocketFirstAccount,
            id: this.firstDataTraceId,
            data: {
              success: true,
              duration: firstDataDuration,
            },
          });

          this.wsConnectionStartTime = null;
          this.firstDataTraceId = undefined;
        }

        // Use base cache Map with consistent key
        this.cache.set('account', account);
        this.notifySubscribers(account as AccountState | null);
        this.triggerPersist();
      },
    });
  }

  protected getCachedData(): AccountState | null {
    const cached = this.cache.get('account');
    if (cached !== undefined) {
      return cached;
    }
    const preloaded = getPreloadedData<AccountState>('cachedAccountState');
    return preloaded;
  }

  protected getClearedData(): AccountState | null {
    return null;
  }

  public getSnapshot() {
    return this.cache.get('account') ?? null;
  }

  public disconnect() {
    // End (not just drop) any open first-data trace before the base teardown.
    this.endOpenFirstDataTrace();
    super.disconnect();
  }

  public clearCache(): void {
    // Cleanup pre-warm subscription
    this.cleanupPrewarm();
    // End (not just drop) any open first-data trace before the base teardown.
    this.endOpenFirstDataTrace();
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

// Open Interest Cap channel for tracking markets at capacity
class OICapStreamChannel extends StreamChannel<string[]> {
  private prewarmUnsubscribe?: () => void;

  protected connect() {
    if (this.wsSubscription) return;

    if (!this.ensureReady()) return;

    // Subscribe to OI cap updates (zero overhead - extracted from existing webData3)
    this.wsSubscription = Engine.context.PerpsController.subscribeToOICaps({
      callback: (caps: string[]) => {
        // Validate account context
        const currentAccount =
          getEvmAccountFromSelectedAccountGroup()?.address || null;
        if (this.accountAddress && this.accountAddress !== currentAccount) {
          Logger.error(new Error('OICapStreamChannel: Wrong account context'), {
            expected: currentAccount,
            received: this.accountAddress,
          });
          return;
        }
        this.accountAddress = currentAccount;

        this.cache.set('oiCaps', caps);
        this.notifySubscribers(caps);
      },
    });
  }

  protected getCachedData(): string[] | null {
    // Return null if no cache exists to distinguish from empty array
    const cached = this.cache.get('oiCaps');
    return cached ?? null;
  }

  protected getClearedData(): string[] {
    return [];
  }

  public getSnapshot(): string[] | null {
    return this.cache.get('oiCaps') ?? null;
  }

  /**
   * Pre-warm the channel by creating a persistent subscription
   * This keeps the WebSocket connection alive and caches data continuously
   * @returns Cleanup function to call when leaving Perps environment
   */
  public prewarm(): () => void {
    if (this.prewarmUnsubscribe) {
      DevLogger.log('OICapStreamChannel: Already pre-warmed');
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
      DevLogger.log('OICapStreamChannel: Cleaning up prewarm subscription');
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

// Top of book channel for best bid/ask data
class TopOfBookStreamChannel extends StreamChannel<
  { bestBid?: string; bestAsk?: string; spread?: string } | undefined
> {
  private currentSymbol: string | null = null;
  private cachedTopOfBook:
    | { bestBid?: string; bestAsk?: string; spread?: string }
    | undefined = undefined;
  private firstDataTraceId?: string;

  protected endOpenFirstDataTrace(): void {
    if (this.firstDataTraceId) {
      endTrace({
        name: TraceName.PerpsWebSocketFirstOrderBook,
        id: this.firstDataTraceId,
        data: { success: false, reason: 'disconnected' },
      });
      this.firstDataTraceId = undefined;
    }
  }

  protected connect() {
    if (!this.currentSymbol || this.wsSubscription) {
      return;
    }

    if (!this.ensureReady()) return;

    DevLogger.log(`TopOfBookStreamChannel: Subscribing to top of book`, {
      symbol: this.currentSymbol,
    });

    // Start trace for first top-of-book measurement (before subscription)
    this.firstDataTraceId = uuidv4();
    trace({
      name: TraceName.PerpsWebSocketFirstOrderBook,
      id: this.firstDataTraceId,
      op: TraceOperation.PerpsOperation,
    });
    this.wsConnectionStartTime = performance.now();

    this.wsSubscription = Engine.context.PerpsController.subscribeToPrices({
      symbols: [this.currentSymbol],
      includeOrderBook: true,
      callback: (updates: PriceUpdate[]) => {
        const update = updates.find((u) => u.symbol === this.currentSymbol);
        if (update) {
          // Track first top-of-book data (only once per connection)
          if (this.wsConnectionStartTime !== null && this.firstDataTraceId) {
            const firstDataDuration =
              performance.now() - this.wsConnectionStartTime;
            DevLogger.log(
              `${PERFORMANCE_CONFIG.LoggingMarkers.WebsocketPerformance} PerpsWS: First order book data received`,
              { duration: `${firstDataDuration.toFixed(0)}ms` },
            );
            endTrace({
              name: TraceName.PerpsWebSocketFirstOrderBook,
              id: this.firstDataTraceId,
              data: { success: true, duration: firstDataDuration },
            });
            this.wsConnectionStartTime = null;
            this.firstDataTraceId = undefined;
          }

          const topOfBook = {
            bestBid: update.bestBid,
            bestAsk: update.bestAsk,
            spread: update.spread,
          };
          this.cachedTopOfBook = topOfBook;
          this.notifySubscribers(topOfBook);
        }
      },
    });
  }

  protected getCachedData():
    | { bestBid?: string; bestAsk?: string; spread?: string }
    | undefined {
    return this.cachedTopOfBook;
  }

  protected getClearedData():
    | { bestBid?: string; bestAsk?: string; spread?: string }
    | undefined {
    return undefined;
  }

  public getSnapshot():
    | { bestBid?: string; bestAsk?: string; spread?: string }
    | undefined
    | null {
    return this.cachedTopOfBook ?? null;
  }

  public clearCache(): void {
    this.cachedTopOfBook = undefined;
    super.clearCache();
  }

  subscribeToSymbol(params: {
    symbol: string;
    callback: (
      orderBook:
        | { bestBid?: string; bestAsk?: string; spread?: string }
        | undefined,
    ) => void;
  }): () => void {
    if (this.currentSymbol && this.currentSymbol !== params.symbol) {
      DevLogger.log(
        'TopOfBookStreamChannel: Warning - different symbol requested, staying on current',
        {
          currentSymbol: this.currentSymbol,
          requestedSymbol: params.symbol,
        },
      );

      // Force disconnect to clear old symbol
      this.disconnect();

      // Set new symbol
      this.currentSymbol = params.symbol;
    } else if (!this.currentSymbol) {
      this.currentSymbol = params.symbol;
    }

    return this.subscribe({
      callback: params.callback,
    });
  }

  public disconnect() {
    this.currentSymbol = null;
    this.cachedTopOfBook = undefined;
    super.disconnect();
  }
}

// Market data channel for caching market list data
class MarketDataChannel extends StreamChannel<PerpsMarketData[]> {
  private lastFetchTime = 0;
  private fetchPromise: Promise<void> | null = null;
  private cachedProviderId: string | null = null;
  private readonly CACHE_DURATION =
    PERFORMANCE_CONFIG.MarketDataCacheDurationMs;

  protected connect() {
    if (!this.ensureReady()) return;

    // Check if connection manager is still connecting - retry later if so
    if (PerpsConnectionManager.isCurrentlyConnecting()) {
      this.deferConnect(PERPS_CONSTANTS.ConnectRetryDelayMs);
      return;
    }

    // Get current provider ID + network + terminal flag as a composite key.
    // Network changes (testnet toggle) and terminal backend flag changes must
    // also invalidate the market cache so a HyperLiquid-sourced response is
    // never served after the flag flips to Terminal (and vice-versa).
    const controller = Engine.context.PerpsController;
    const currentProviderId =
      controller.state?.activeProvider || PROVIDER_CONFIG.DefaultProvider;
    const terminalEnabled = selectPerpsTerminalBackendEnabledFlag(
      store.getState(),
    );
    const currentNetworkKey = `${buildProviderCacheKey(
      currentProviderId,
      controller.state?.isTestnet ?? false,
    )}:${terminalEnabled ? 'terminal' : 'direct'}`;

    // Invalidate cache if provider, network, OR terminal flag changed
    if (this.cachedProviderId && this.cachedProviderId !== currentNetworkKey) {
      DevLogger.log(
        'PerpsStreamManager: Provider/network/flag changed, invalidating cache',
        {
          from: this.cachedProviderId,
          to: currentNetworkKey,
        },
      );
      this.cache.delete('markets');
      this.lastFetchTime = 0;
    }

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
        providerId: currentProviderId,
      });
      // Don't await - just trigger the fetch and handle errors
      this.fetchMarketData().catch((error) => {
        Logger.error(
          ensureError(error, 'PerpsStreamManager.fetchMarketData.background'),
          'PerpsStreamManager: Failed to fetch market data',
        );
      });
    } else {
      DevLogger.log('PerpsStreamManager: Using cached market data', {
        cacheAgeMs: cacheAge,
        cacheAgeSeconds: Math.round(cacheAge / 1000),
        marketCount: cached.length,
        cacheValidForMs: this.CACHE_DURATION - cacheAge,
        providerId: currentProviderId,
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
        const controller = Engine.context.PerpsController;

        // Read terminal flag once at the start of this fetch cycle.
        const terminalEnabled = selectPerpsTerminalBackendEnabledFlag(
          store.getState(),
        );
        const terminalSuffix = terminalEnabled ? 'terminal' : 'direct';

        // One-time read of controller-level preloaded cache (REST snapshot).
        // This avoids an HTTP round-trip when the controller already has fresh data.
        // Include terminal flag in the key so a flag flip forces a fresh fetch.
        const controllerNetworkKey = `${getProviderNetworkKey(controller.state)}:${terminalSuffix}`;

        // The controller's preload cache (cachedMarketDataByProvider) is keyed only
        // by provider/network and is ALWAYS sourced from the direct provider — its
        // background preload calls getMarketDataWithPrices() without useTerminalApi,
        // so it never contains Terminal-API data. It is therefore only safe to adopt
        // when the Terminal backend is disabled. Adopting it while Terminal is enabled
        // (e.g. after a flag flip, or on startup if preload ran before the remote flag
        // settled) would serve direct HyperLiquid data and cache it as Terminal data
        // (or the reverse). When the source can't be guaranteed to match, skip the
        // preloaded cache and fetch fresh market data below.
        const controllerCacheSourceMatches = !terminalEnabled;
        const cachedForProvider = controllerCacheSourceMatches
          ? controller.getCachedMarketDataForActiveProvider?.()
          : undefined;
        if (
          cachedForProvider &&
          cachedForProvider.length > 0 &&
          (!this.cachedProviderId ||
            this.cachedProviderId === controllerNetworkKey)
        ) {
          DevLogger.log(
            'PerpsStreamManager: Using controller preloaded market data',
            {
              marketCount: cachedForProvider.length,
            },
          );
          this.cache.set('markets', cachedForProvider);
          this.lastFetchTime = Date.now();
          this.cachedProviderId = controllerNetworkKey;
          this.notifySubscribers(cachedForProvider);
          return;
        }

        DevLogger.log(
          'PerpsStreamManager: Fetching fresh market data from API',
        );

        // Snapshot provider + network + flag BEFORE the async call to avoid race conditions.
        // If the user switches providers, toggles testnet, or the terminal flag flips while
        // getMarketDataWithPrices() is in-flight, we must not cache data under the new key.
        const preFetchNetworkKey = `${getProviderNetworkKey(controller.state)}:${terminalSuffix}`;

        const data = await controller.getMarketDataWithPrices({
          useTerminalApi: terminalEnabled,
        });
        const fetchTime = Date.now() - fetchStartTime;

        // If provider, network, or terminal flag changed during fetch, discard stale data
        const postTerminalEnabled = selectPerpsTerminalBackendEnabledFlag(
          store.getState(),
        );
        const postFetchNetworkKey = `${getProviderNetworkKey(controller.state)}:${postTerminalEnabled ? 'terminal' : 'direct'}`;
        if (preFetchNetworkKey !== postFetchNetworkKey) {
          DevLogger.log(
            'PerpsStreamManager: Provider/network/flag changed during fetch, discarding data',
            {
              fetchedFor: preFetchNetworkKey,
              current: postFetchNetworkKey,
            },
          );
          return;
        }

        // Update cache and track which provider+network this data came from
        this.cache.set('markets', data);
        this.lastFetchTime = Date.now();
        this.cachedProviderId = preFetchNetworkKey;

        // Notify all subscribers
        this.notifySubscribers(data);
        this.triggerPersist();

        DevLogger.log('PerpsStreamManager: Market data fetched and cached', {
          marketCount: data.length,
          fetchTimeMs: fetchTime,
          providerId: this.cachedProviderId,
          cacheValidUntil: new Date(
            Date.now() + this.CACHE_DURATION,
          ).toISOString(),
        });
      } catch (error) {
        const fetchTime = Date.now() - fetchStartTime;
        const existing = this.cache.get('markets');
        const cacheStalenessMs = this.lastFetchTime
          ? Date.now() - this.lastFetchTime
          : null;
        Logger.error(ensureError(error, 'PerpsStreamManager.fetchMarketData'), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
          },
          context: {
            name: 'PerpsStreamManager',
            data: {
              method: 'fetchMarketData',
              fetchTimeMs: fetchTime,
              hadCachedData: !!existing,
              cachedMarketCount: existing?.length ?? 0,
              cacheStalenessMs,
            },
          },
        });
        // Keep existing cache if fetch fails
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
    // Return channel cache if available (from previous fetch)
    const cached = this.cache.get('markets');
    if (cached !== undefined) {
      return cached;
    }

    // Fallback: read per-provider cache via helper. The controller's preload cache
    // is always direct-sourced (its preload never passes useTerminalApi), so only
    // serve it synchronously when the Terminal backend is disabled — otherwise we'd
    // surface direct HyperLiquid data while in Terminal mode. When Terminal is
    // enabled, return null so callers wait for a source-correct fetch instead.
    const terminalEnabled = selectPerpsTerminalBackendEnabledFlag(
      store.getState(),
    );
    if (terminalEnabled) {
      return null;
    }

    const controller = Engine.context.PerpsController;
    const fromController =
      controller.getCachedMarketDataForActiveProvider?.() ?? null;
    return fromController;
  }

  protected getClearedData(): PerpsMarketData[] {
    return [];
  }

  public getSnapshot() {
    return this.cache.get('markets') ?? null;
  }

  /**
   * Prewarm market data cache
   * @returns Cleanup function (no-op for REST data)
   */
  public prewarm(): () => void {
    // Fetch data immediately to populate cache
    this.fetchMarketData().catch((error) => {
      Logger.error(ensureError(error, 'MarketDataChannel.prewarm'), {
        context: 'MarketDataChannel.prewarm',
      });
    });

    // No cleanup needed for REST data
    return () => {
      // No-op
    };
  }

  /**
   * Clear cache and reset fetch time.
   *
   * @param preserveCache - When true, subscribers keep their current data (used on
   * account switches where market data is global and stays valid). When false
   * (default), subscribers are notified with `[]` and their throttle state is
   * reset so the next fetch result is delivered immediately.
   */
  public clearCache(preserveCache = false): void {
    this.fetchPromise = null;

    if (!preserveCache) {
      this.cache.clear();
      this.lastFetchTime = 0;
      this.cachedProviderId = null;
    }

    this.subscribers.forEach((subscriber) => {
      if (subscriber.timer) {
        clearTimeout(subscriber.timer);
        subscriber.timer = undefined;
      }
      subscriber.pendingUpdate = undefined;

      if (!preserveCache) {
        subscriber.hasReceivedFirstUpdate = false;
        subscriber.callback([]);
      }
    });
  }
}

// Main manager class
export class PerpsStreamManager {
  public readonly prices = new PriceStreamChannel();
  public readonly orders = new OrderStreamChannel(() =>
    this.persistUserDataToDisk(),
  );
  public readonly positions = new PositionStreamChannel(() =>
    this.persistUserDataToDisk(),
  );
  public readonly fills = new FillStreamChannel();
  public readonly account = new AccountStreamChannel(() =>
    this.persistUserDataToDisk(),
  );
  public readonly marketData = new MarketDataChannel(() =>
    this.persistMarketDataToDisk(),
  );
  public readonly oiCaps = new OICapStreamChannel();
  public readonly topOfBook = new TopOfBookStreamChannel();
  public readonly candles = new CandleStreamChannel(
    () => PerpsConnectionManager.getConnectionState().isInitialized,
  );

  // Disk cache throttle timestamps
  private marketDiskWriteTime = 0;
  private userDiskWriteTime = 0;

  resetDiskCacheThrottles(): void {
    this.marketDiskWriteTime = 0;
    this.userDiskWriteTime = 0;
  }

  /**
   * Persist current market data snapshot to disk (throttled).
   * Called after MarketDataChannel receives fresh data.
   */
  persistMarketDataToDisk(): void {
    const now = Date.now();
    if (now - this.marketDiskWriteTime < PERPS_DISK_CACHE_THROTTLE_MS) return;

    const snapshot = this.marketData.getSnapshot();
    if (!snapshot || snapshot.length === 0) return;

    const { activeProvider, isTestnet } = Engine.context.PerpsController.state;
    const payload = buildMarketDataPayload(
      snapshot,
      activeProvider,
      isTestnet,
      now,
    );

    this.marketDiskWriteTime = now;
    StorageWrapper.setItem(
      PERPS_DISK_CACHE_MARKETS,
      JSON.stringify(payload),
    )?.catch(() => {
      /* fire-and-forget */
    });
  }

  /**
   * Persist current user data snapshot to disk (throttled).
   * Called after position/order/account channels receive fresh data.
   */
  persistUserDataToDisk(): void {
    const now = Date.now();
    if (now - this.userDiskWriteTime < PERPS_DISK_CACHE_THROTTLE_MS) return;

    const address = getEvmAccountFromSelectedAccountGroup()?.address;
    if (!address) return;

    const positions = this.positions.getSnapshot();
    const orders = this.orders.getSnapshot();
    const account = this.account.getSnapshot();

    // Only persist when all channels have delivered to avoid writing
    // incomplete snapshots that consume the throttle window
    if (!positions || !orders || !account) return;

    const { activeProvider, isTestnet } = Engine.context.PerpsController.state;
    const payload = buildUserDataPayload(
      positions,
      orders,
      account,
      address,
      activeProvider,
      isTestnet,
      now,
    );

    this.userDiskWriteTime = now;
    StorageWrapper.setItem(
      PERPS_DISK_CACHE_USER_DATA,
      JSON.stringify(payload),
    )?.catch(() => {
      /* fire-and-forget */
    });
  }

  /**
   * Pause all stream channels — stops emitting updates to subscribers while
   * keeping WebSocket subscriptions alive and cache warm. Call when the Perps
   * UI is not visible to avoid unnecessary processing.
   */
  public pauseAllChannels(): void {
    this.prices.pause();
    this.orders.pause();
    this.positions.pause();
    this.fills.pause();
    this.account.pause();
    this.oiCaps.pause();
    this.topOfBook.pause();
    this.candles.pause();
  }

  /**
   * Resume all stream channels after a pause. Subscribers will receive the
   * next update pushed by the WebSocket.
   */
  public resumeAllChannels(): void {
    this.prices.resume();
    this.orders.resume();
    this.positions.resume();
    this.fills.resume();
    this.account.resume();
    this.oiCaps.resume();
    this.topOfBook.resume();
    this.candles.resume();
  }

  /**
   * Force reconnection of all stream channels after WebSocket reconnection
   * Disconnects all channels and reconnects those with active subscribers
   */
  public clearAllChannels(): void {
    // Reconnect all channels - clears dead subscriptions and re-establishes
    // connections for channels that have active subscribers
    this.prices.reconnect();
    this.orders.reconnect();
    this.positions.reconnect();
    this.fills.reconnect();
    this.account.reconnect();
    this.marketData.reconnect();
    this.oiCaps.reconnect();
    this.topOfBook.reconnect();
    this.candles.reconnect();
  }
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

// Type that only includes channel properties (excludes methods like clearAllChannels)
export type PerpsStreamChannelKey = {
  [K in keyof PerpsStreamManager]: PerpsStreamManager[K] extends {
    pause(): void;
  }
    ? K
    : never;
}[keyof PerpsStreamManager];

// Types are exported from controllers/types
