/**
 * MYXSubscriptionService
 *
 * Service for managing MYX WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting.
 *
 * Key differences from HyperLiquidSubscriptionService:
 * - Uses globalId (number) instead of symbol for subscriptions
 * - Pool-based architecture (MYX Multi-Pool Model)
 * - Different WebSocket event formats (ticker/candle/order/position)
 * - Authentication via subscription.auth() before private subscriptions
 */

import type {
  PriceUpdate,
  Position,
  Order,
  AccountState,
  SubscribePricesParams,
  SubscribePositionsParams,
  SubscribeOrdersParams,
  SubscribeAccountParams,
  IPerpsPlatformDependencies,
} from '../controllers/types';
import {
  adaptPriceUpdateFromMYX,
  adaptPositionFromMYX,
  adaptOrderFromMYX,
  adaptAccountStateFromMYX,
} from '../utils/myxAdapter';
import type { MYXClientService } from './MYXClientService';
import type { MYXWalletService } from './MYXWalletService';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import { ensureError } from '../../../../util/errorUtils';
import type {
  MYXTickerWsResponse,
  MYXKlineWsResponse,
  MYXPosition,
  MYXOrder,
  MYXAccountInfo,
  MYXKlineResolution,
} from '../types/myx-types';
import type {
  OnTickersCallback,
  OnKlineCallback,
  KlineResolution,
} from '@myx-trade/sdk';

/**
 * Type for ticker callback function - using SDK's OnTickersCallback
 */
type TickerCallback = OnTickersCallback;

/**
 * Type for kline callback function - using SDK's OnKlineCallback
 */
type KlineCallback = OnKlineCallback;

/**
 * Type for order callback function
 */
type OrderCallback = (data: MYXOrder) => void;

/**
 * Type for position callback function
 */
type PositionCallback = (data: MYXPosition) => void;

/**
 * Service for managing MYX WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting
 */
export class MYXSubscriptionService {
  // Service dependencies
  private readonly clientService: MYXClientService;
  private readonly walletService: MYXWalletService;

  // Platform dependencies for logging
  private readonly deps: IPerpsPlatformDependencies;

  // Subscriber collections
  private readonly priceSubscribers = new Map<
    number, // globalId
    Set<(prices: PriceUpdate[]) => void>
  >();
  private readonly positionSubscribers = new Set<
    (positions: Position[]) => void
  >();
  private readonly orderSubscribers = new Set<(orders: Order[]) => void>();
  private readonly accountSubscribers = new Set<
    (account: AccountState) => void
  >();

  // Subscription callbacks (for cleanup)
  private readonly tickerCallbacks = new Map<number, TickerCallback>();
  private readonly klineCallbacks = new Map<string, KlineCallback>(); // Key: `${globalId}-${resolution}`
  private orderCallback: OrderCallback | null = null;
  private positionCallback: PositionCallback | null = null;

  // Reference counting for subscriptions
  private readonly globalIdSubscriberCounts = new Map<number, number>();
  private positionSubscriberCount = 0;
  private orderSubscriberCount = 0;
  private accountSubscriberCount = 0;

  // WebSocket authentication state
  private isAuthenticated = false;
  private authenticationPromise: Promise<void> | null = null;

  // Data caches
  private cachedPriceData = new Map<string, PriceUpdate>(); // Keyed by symbol
  private cachedPositions: Position[] = [];
  private cachedOrders: Order[] = [];
  private cachedAccount: AccountState | null = null;
  private cachedAccountInfoByPool = new Map<string, MYXAccountInfo>();

  // Hash caches for change detection
  private cachedPositionsHash = '';
  private cachedOrdersHash = '';
  private cachedAccountHash = '';

  constructor(
    clientService: MYXClientService,
    walletService: MYXWalletService,
    deps: IPerpsPlatformDependencies,
  ) {
    this.clientService = clientService;
    this.walletService = walletService;
    this.deps = deps;
  }

  /**
   * Get error context for logging with searchable tags and context.
   * Enables Sentry dashboard filtering by feature, provider, and network.
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): {
    tags?: Record<string, string | number>;
    context?: { name: string; data: Record<string, unknown> };
    extras?: Record<string, unknown>;
  } {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FEATURE_NAME,
        provider: 'myx',
        network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      },
      context: {
        name: 'MYXSubscriptionService',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  // ============================================================================
  // Helper: Generic Subscription Management
  // ============================================================================

  /**
   * Create a subscription entry with automatic cleanup
   */
  private createSubscription<T>(
    subscribers: Map<number, Set<T>> | Set<T>,
    callback: T,
    key?: number,
  ): () => void {
    if (subscribers instanceof Map && key !== undefined) {
      let subscriberSet = subscribers.get(key);
      if (!subscriberSet) {
        subscriberSet = new Set();
        subscribers.set(key, subscriberSet);
      }
      subscriberSet.add(callback);

      return () => {
        const existingSet = subscribers.get(key);
        if (existingSet) {
          existingSet.delete(callback);
          if (existingSet.size === 0) {
            subscribers.delete(key);
          }
        }
      };
    }

    const simpleSet = subscribers as Set<T>;
    simpleSet.add(callback);
    return () => simpleSet.delete(callback);
  }

  // ============================================================================
  // Hash Functions for Change Detection
  // ============================================================================

  private hashPositions(positions: Position[]): string {
    if (!positions || positions.length === 0) return '0';
    return positions
      .map(
        (p) =>
          `${p.coin}:${p.size}:${p.entryPrice}:${p.leverage.value}:${
            p.unrealizedPnl
          }:${p.returnOnEquity}`,
      )
      .join('|');
  }

  private hashOrders(orders: Order[]): string {
    if (!orders || orders.length === 0) return '0';
    return orders
      .map((o) => `${o.symbol}:${o.side}:${o.size}:${o.price}:${o.orderType}`)
      .join('|');
  }

  private hashAccountState(account: AccountState): string {
    return `${account.availableBalance}:${account.totalBalance}:${account.marginUsed}:${account.unrealizedPnl}`;
  }

  // ============================================================================
  // WebSocket Connection Management
  // ============================================================================

  /**
   * Ensure WebSocket is connected
   */
  private async ensureConnection(): Promise<void> {
    const client = this.clientService.getClient();
    if (!client) {
      throw new Error('MYX client not initialized');
    }

    // Connect WebSocket if not connected
    if (!client.subscription.isConnected) {
      client.subscription.connect();

      // Set up event listeners
      client.subscription.on('close', () => {
        this.deps.debugLogger.log('[MYXSubscriptionService] WebSocket closed');
        this.isAuthenticated = false;
      });

      client.subscription.on('error', (error: unknown) => {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('websocket.error'),
        );
      });

      client.subscription.on('reconnecting', () => {
        this.deps.debugLogger.log(
          '[MYXSubscriptionService] WebSocket reconnecting',
        );
        this.isAuthenticated = false;
      });
    }
  }

  /**
   * Ensure WebSocket is authenticated for private subscriptions
   * Authentication may fail if user rejects signature - caller handles graceful degradation
   */
  private async ensureAuthentication(): Promise<void> {
    if (this.isAuthenticated) {
      return;
    }

    // Prevent concurrent authentication attempts
    if (this.authenticationPromise) {
      await this.authenticationPromise;
      return;
    }

    const client = this.clientService.getClient();
    if (!client) {
      throw new Error('MYX client not initialized');
    }

    this.authenticationPromise = (async () => {
      try {
        await this.ensureConnection();
        // SDK will call getAccessToken callback internally
        await client.subscription.auth();
        this.isAuthenticated = true;
        this.deps.debugLogger.log(
          '[MYXSubscriptionService] WebSocket authenticated',
        );
      } catch (error) {
        this.deps.debugLogger.log(
          '[MYXSubscriptionService] WebSocket auth failed, will use REST fallback',
          { reason: ensureError(error).message },
        );
        throw error;
      } finally {
        this.authenticationPromise = null;
      }
    })();

    await this.authenticationPromise;
  }

  // ============================================================================
  // Price Subscriptions
  // ============================================================================

  /**
   * Subscribe to live price updates
   * Uses globalId-based ticker subscriptions
   */
  public async subscribeToPrices(
    params: SubscribePricesParams,
  ): Promise<() => void> {
    const { symbols, callback } = params;
    const unsubscribers: (() => void)[] = [];

    await this.ensureConnection();

    const client = this.clientService.getClient();
    if (!client) {
      throw new Error('MYX client not initialized');
    }

    // Map symbols to globalIds and subscribe
    for (const symbol of symbols) {
      const globalId = await this.clientService.getGlobalIdForSymbol(symbol);
      if (globalId === undefined) {
        this.deps.debugLogger.log(
          `[MYXSubscriptionService] No globalId found for symbol: ${symbol}`,
        );
        continue;
      }

      // Add subscriber
      unsubscribers.push(
        this.createSubscription(this.priceSubscribers, callback, globalId),
      );

      // Track reference count
      const currentCount = this.globalIdSubscriberCounts.get(globalId) || 0;
      this.globalIdSubscriberCounts.set(globalId, currentCount + 1);

      // Create subscription if first subscriber
      if (currentCount === 0) {
        const tickerCallback: TickerCallback = (data) => {
          this.handleTickerUpdate(data as MYXTickerWsResponse, symbol);
        };

        this.tickerCallbacks.set(globalId, tickerCallback);
        client.subscription.subscribeTickers(globalId, tickerCallback);
      }

      // Send cached data immediately if available
      const cachedPrice = this.cachedPriceData.get(symbol);
      if (cachedPrice) {
        callback([cachedPrice]);
      }
    }

    // Return cleanup function
    return () => {
      unsubscribers.forEach((fn) => fn());

      // Cleanup subscriptions with reference counting
      for (const symbol of symbols) {
        this.clientService
          .getGlobalIdForSymbol(symbol)
          .then((globalId: number | undefined) => {
            if (globalId === undefined) return;

            const currentCount =
              this.globalIdSubscriberCounts.get(globalId) || 0;
            if (currentCount <= 1) {
              // Last subscriber, unsubscribe from WebSocket
              const tickerCallback = this.tickerCallbacks.get(globalId);
              if (tickerCallback && client) {
                client.subscription.unsubscribeTickers(
                  globalId,
                  tickerCallback,
                );
                this.tickerCallbacks.delete(globalId);
              }
              this.globalIdSubscriberCounts.delete(globalId);
            } else {
              this.globalIdSubscriberCounts.set(globalId, currentCount - 1);
            }
          })
          .catch((error: unknown) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext('subscribeToPrices.cleanup', { symbol }),
            );
          });
      }
    };
  }

  /**
   * Handle ticker update from WebSocket
   */
  private handleTickerUpdate(data: MYXTickerWsResponse, symbol: string): void {
    const priceUpdate = adaptPriceUpdateFromMYX(data, symbol);
    this.cachedPriceData.set(symbol, priceUpdate);

    // Notify all subscribers for this globalId
    const subscribers = this.priceSubscribers.get(data.globalId);
    if (subscribers) {
      subscribers.forEach((cb) => {
        try {
          cb([priceUpdate]);
        } catch (error) {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('handleTickerUpdate.callback', { symbol }),
          );
        }
      });
    }
  }

  // ============================================================================
  // Position Subscriptions
  // ============================================================================

  /**
   * Subscribe to position updates
   * Requires authentication - degrades gracefully if auth fails
   */
  public async subscribeToPositions(
    params: SubscribePositionsParams,
  ): Promise<() => void> {
    const { callback } = params;

    // Try authentication, but degrade gracefully if unavailable
    try {
      await this.ensureAuthentication();
    } catch {
      this.deps.debugLogger.log(
        '[MYXSubscriptionService] Position subscription unavailable - using cached/REST data',
      );
      // Return cached data if available
      if (this.cachedPositions.length > 0) {
        callback(this.cachedPositions);
      }
      // No-op unsubscribe since WebSocket subscription was not established
      return () => undefined;
    }

    const client = this.clientService.getClient();
    if (!client) {
      throw new Error('MYX client not initialized');
    }

    // Add subscriber
    const unsubscribe = this.createSubscription(
      this.positionSubscribers,
      callback,
    );
    this.positionSubscriberCount++;

    // Create subscription if first subscriber
    if (this.positionSubscriberCount === 1) {
      this.positionCallback = async (data: MYXPosition) => {
        await this.handlePositionUpdate(data);
      };

      await client.subscription.subscribePosition(this.positionCallback);
    }

    // Send cached data immediately
    if (this.cachedPositions.length > 0) {
      callback(this.cachedPositions);
    }

    // Return cleanup function
    return () => {
      unsubscribe();
      this.positionSubscriberCount--;

      if (
        this.positionSubscriberCount === 0 &&
        this.positionCallback &&
        client
      ) {
        client.subscription.unsubscribePosition(this.positionCallback);
        this.positionCallback = null;
      }
    };
  }

  /**
   * Handle position update from WebSocket
   */
  private async handlePositionUpdate(data: MYXPosition): Promise<void> {
    // Get symbol for the pool
    const symbol = await this.clientService.getSymbolForPoolId(data.poolId);
    if (!symbol) {
      this.deps.debugLogger.log(
        `[MYXSubscriptionService] No symbol found for poolId: ${data.poolId}`,
      );
      return;
    }

    // Adapt position to MetaMask format
    const position = adaptPositionFromMYX(data);
    position.coin = symbol; // Override with resolved symbol

    // Update cached positions (merge or add)
    const existingIndex = this.cachedPositions.findIndex(
      (p) => p.coin === position.coin,
    );
    if (existingIndex >= 0) {
      // Position closed if size is 0
      if (parseFloat(position.size) === 0) {
        this.cachedPositions.splice(existingIndex, 1);
      } else {
        this.cachedPositions[existingIndex] = position;
      }
    } else if (parseFloat(position.size) !== 0) {
      this.cachedPositions.push(position);
    }

    // Check for changes
    const newHash = this.hashPositions(this.cachedPositions);
    if (newHash === this.cachedPositionsHash) {
      return;
    }
    this.cachedPositionsHash = newHash;

    // Notify subscribers
    this.positionSubscribers.forEach((cb) => {
      try {
        cb([...this.cachedPositions]);
      } catch (error) {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('handlePositionUpdate.callback'),
        );
      }
    });
  }

  // ============================================================================
  // Order Subscriptions
  // ============================================================================

  /**
   * Subscribe to order updates
   * Requires authentication - degrades gracefully if auth fails
   */
  public async subscribeToOrders(
    params: SubscribeOrdersParams,
  ): Promise<() => void> {
    const { callback } = params;

    // Try authentication, but degrade gracefully if unavailable
    try {
      await this.ensureAuthentication();
    } catch {
      this.deps.debugLogger.log(
        '[MYXSubscriptionService] Order subscription unavailable - using cached/REST data',
      );
      // Return cached data if available
      if (this.cachedOrders.length > 0) {
        callback(this.cachedOrders);
      }
      // No-op unsubscribe since WebSocket subscription was not established
      return () => undefined;
    }

    const client = this.clientService.getClient();
    if (!client) {
      throw new Error('MYX client not initialized');
    }

    // Add subscriber
    const unsubscribe = this.createSubscription(
      this.orderSubscribers,
      callback,
    );
    this.orderSubscriberCount++;

    // Create subscription if first subscriber
    if (this.orderSubscriberCount === 1) {
      this.orderCallback = async (data: MYXOrder) => {
        await this.handleOrderUpdate(data);
      };

      await client.subscription.subscribeOrder(this.orderCallback);
    }

    // Send cached data immediately
    if (this.cachedOrders.length > 0) {
      callback(this.cachedOrders);
    }

    // Return cleanup function
    return () => {
      unsubscribe();
      this.orderSubscriberCount--;

      if (this.orderSubscriberCount === 0 && this.orderCallback && client) {
        client.subscription.unsubscribeOrder(this.orderCallback);
        this.orderCallback = null;
      }
    };
  }

  /**
   * Handle order update from WebSocket
   */
  private async handleOrderUpdate(data: MYXOrder): Promise<void> {
    // Get symbol for the pool
    const symbol = await this.clientService.getSymbolForPoolId(data.poolId);
    if (!symbol) {
      this.deps.debugLogger.log(
        `[MYXSubscriptionService] No symbol found for poolId: ${data.poolId}`,
      );
      return;
    }

    // Adapt order to MetaMask format
    const symbolPoolMap = new Map<string, string>([[data.poolId, symbol]]);
    const order = adaptOrderFromMYX(data, symbolPoolMap);

    // Update cached orders based on status
    const existingIndex = this.cachedOrders.findIndex(
      (o) => o.orderId === order.orderId,
    );

    // Remove order if filled, cancelled, rejected, or expired
    const terminalStatuses = ['filled', 'cancelled', 'rejected', 'expired'];
    if (terminalStatuses.includes(order.status)) {
      if (existingIndex >= 0) {
        this.cachedOrders.splice(existingIndex, 1);
      }
    } else if (existingIndex >= 0) {
      this.cachedOrders[existingIndex] = order;
    } else {
      this.cachedOrders.push(order);
    }

    // Check for changes
    const newHash = this.hashOrders(this.cachedOrders);
    if (newHash === this.cachedOrdersHash) {
      return;
    }
    this.cachedOrdersHash = newHash;

    // Notify subscribers
    this.orderSubscribers.forEach((cb) => {
      try {
        cb([...this.cachedOrders]);
      } catch (error) {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('handleOrderUpdate.callback'),
        );
      }
    });
  }

  // ============================================================================
  // Account Subscriptions
  // ============================================================================

  /**
   * Subscribe to account state updates
   * MYX doesn't have a dedicated account WebSocket subscription,
   * so we derive account state from position updates
   */
  public async subscribeToAccount(
    params: SubscribeAccountParams,
  ): Promise<() => void> {
    const { callback } = params;

    // Add subscriber
    const unsubscribe = this.createSubscription(
      this.accountSubscribers,
      callback,
    );
    this.accountSubscriberCount++;

    // Subscribe to positions to derive account state
    const positionUnsubscribe = await this.subscribeToPositions({
      callback: async () => {
        await this.updateAccountState();
      },
    });

    // Send cached data immediately
    if (this.cachedAccount) {
      callback(this.cachedAccount);
    }

    // Return cleanup function
    return () => {
      unsubscribe();
      positionUnsubscribe();
      this.accountSubscriberCount--;
    };
  }

  /**
   * Update and notify account state
   * Aggregates account info from all pools with positions
   */
  private async updateAccountState(): Promise<void> {
    try {
      // Get unique pools from cached positions
      const poolIds = new Set<string>();
      for (const position of this.cachedPositions) {
        const poolId = await this.clientService.getPoolIdForSymbol(
          position.coin,
        );
        if (poolId) {
          poolIds.add(poolId);
        }
      }

      // Fetch account info for each pool
      const userAddress = this.walletService.getCurrentUserAddress();
      const accountInfos: MYXAccountInfo[] = [];

      for (const poolId of poolIds) {
        try {
          const info = await this.clientService.getAccountInfo(
            userAddress,
            poolId,
          );
          if (info) {
            accountInfos.push(info);
            this.cachedAccountInfoByPool.set(poolId, info);
          }
        } catch (error) {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('updateAccountState.getAccountInfo', {
              poolId,
            }),
          );
        }
      }

      // Aggregate account state
      const aggregatedAccount = adaptAccountStateFromMYX(accountInfos);

      // Check for changes
      const newHash = this.hashAccountState(aggregatedAccount);
      if (newHash === this.cachedAccountHash) {
        return;
      }
      this.cachedAccountHash = newHash;
      this.cachedAccount = aggregatedAccount;

      // Notify subscribers
      this.accountSubscribers.forEach((cb) => {
        try {
          cb(aggregatedAccount);
        } catch (error) {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('updateAccountState.callback'),
          );
        }
      });
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updateAccountState'),
      );
    }
  }

  // ============================================================================
  // Kline (Candlestick) Subscriptions
  // ============================================================================

  /**
   * Subscribe to kline/candlestick updates for a specific pool and resolution
   */
  public async subscribeToKline(
    symbol: string,
    resolution: MYXKlineResolution,
    callback: (data: MYXKlineWsResponse) => void,
  ): Promise<() => void> {
    await this.ensureConnection();

    const client = this.clientService.getClient();
    if (!client) {
      throw new Error('MYX client not initialized');
    }

    const globalId = await this.clientService.getGlobalIdForSymbol(symbol);
    if (globalId === undefined) {
      throw new Error(`No globalId found for symbol: ${symbol}`);
    }

    const key = `${globalId}-${resolution}`;

    // Create and store callback - cast resolution to KlineResolution
    const klineCallback: KlineCallback = (data) => {
      callback(data as MYXKlineWsResponse);
    };

    this.klineCallbacks.set(key, klineCallback);
    client.subscription.subscribeKline(
      globalId,
      resolution as KlineResolution,
      klineCallback,
    );

    // Return cleanup function
    return () => {
      const storedCallback = this.klineCallbacks.get(key);
      if (storedCallback && client) {
        client.subscription.unsubscribeKline(
          globalId,
          resolution as KlineResolution,
          storedCallback,
        );
        this.klineCallbacks.delete(key);
      }
    };
  }

  // ============================================================================
  // Cache Access
  // ============================================================================

  /**
   * Get cached price data for a symbol
   */
  public getCachedPrice(symbol: string): PriceUpdate | undefined {
    return this.cachedPriceData.get(symbol);
  }

  /**
   * Get cached positions
   */
  public getCachedPositions(): Position[] {
    return [...this.cachedPositions];
  }

  /**
   * Get cached orders
   */
  public getCachedOrders(): Order[] {
    return [...this.cachedOrders];
  }

  /**
   * Get cached account state
   */
  public getCachedAccount(): AccountState | null {
    return this.cachedAccount;
  }

  // ============================================================================
  // Cache Management
  // ============================================================================

  /**
   * Clear all cached data
   */
  public clearCaches(): void {
    this.cachedPriceData.clear();
    this.cachedPositions = [];
    this.cachedOrders = [];
    this.cachedAccount = null;
    this.cachedAccountInfoByPool.clear();
    this.cachedPositionsHash = '';
    this.cachedOrdersHash = '';
    this.cachedAccountHash = '';
  }

  /**
   * Initialize caches with current data from API
   */
  public async initializeCaches(): Promise<void> {
    try {
      const userAddress = this.walletService.getCurrentUserAddress();

      // Fetch initial positions
      const positions = await this.clientService.getPositions(userAddress);
      for (const pos of positions) {
        const symbol = await this.clientService.getSymbolForPoolId(pos.poolId);
        if (symbol) {
          const position = adaptPositionFromMYX(pos);
          position.coin = symbol; // Override with resolved symbol
          this.cachedPositions.push(position);
        }
      }
      this.cachedPositionsHash = this.hashPositions(this.cachedPositions);

      // Fetch initial orders
      const orders = await this.clientService.getOpenOrders(userAddress);
      for (const order of orders) {
        const symbol = await this.clientService.getSymbolForPoolId(
          order.poolId,
        );
        if (symbol) {
          const symbolPoolMap = new Map<string, string>([
            [order.poolId, symbol],
          ]);
          this.cachedOrders.push(adaptOrderFromMYX(order, symbolPoolMap));
        }
      }
      this.cachedOrdersHash = this.hashOrders(this.cachedOrders);

      this.deps.debugLogger.log('[MYXSubscriptionService] Caches initialized', {
        positions: this.cachedPositions.length,
        orders: this.cachedOrders.length,
      });
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('initializeCaches'),
      );
    }
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  /**
   * Disconnect WebSocket and cleanup all subscriptions
   */
  public async disconnect(): Promise<void> {
    const client = this.clientService.getClient();
    if (client?.subscription.isConnected) {
      // Unsubscribe from all tickers
      for (const [globalId, callback] of this.tickerCallbacks) {
        client.subscription.unsubscribeTickers(globalId, callback);
      }
      this.tickerCallbacks.clear();

      // Unsubscribe from all klines
      for (const [key, callback] of this.klineCallbacks) {
        const [globalIdStr, resolution] = key.split('-');
        const globalId = Number.parseInt(globalIdStr, 10);
        client.subscription.unsubscribeKline(
          globalId,
          resolution as KlineResolution,
          callback,
        );
      }
      this.klineCallbacks.clear();

      // Unsubscribe from orders
      if (this.orderCallback) {
        client.subscription.unsubscribeOrder(this.orderCallback);
        this.orderCallback = null;
      }

      // Unsubscribe from positions
      if (this.positionCallback) {
        client.subscription.unsubscribePosition(this.positionCallback);
        this.positionCallback = null;
      }

      // Disconnect WebSocket
      client.subscription.disconnect();
    }

    // Clear all subscribers
    this.priceSubscribers.clear();
    this.positionSubscribers.clear();
    this.orderSubscribers.clear();
    this.accountSubscribers.clear();

    // Reset counts
    this.globalIdSubscriberCounts.clear();
    this.positionSubscriberCount = 0;
    this.orderSubscriberCount = 0;
    this.accountSubscriberCount = 0;

    // Reset authentication state
    this.isAuthenticated = false;
    this.authenticationPromise = null;

    // Clear caches
    this.clearCaches();

    this.deps.debugLogger.log(
      '[MYXSubscriptionService] Disconnected and cleaned up',
    );
  }
}
