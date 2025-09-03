import {
  type Subscription,
  type WsAllMids,
  type WsWebData2,
  type WsUserFills,
  type WsActiveAssetCtx,
  type WsActiveSpotAssetCtx,
  type PerpsAssetCtx,
  type Book,
} from '@deeeed/hyperliquid-node20';
import performance from 'react-native-performance';
import {
  trace,
  endTrace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  PriceUpdate,
  Position,
  OrderFill,
  Order,
  AccountState,
  SubscribePricesParams,
  SubscribePositionsParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribeAccountParams,
} from '../controllers/types';
import {
  adaptPositionFromSDK,
  adaptOrderFromSDK,
  adaptAccountStateFromSDK,
} from '../utils/hyperLiquidAdapter';
import type { HyperLiquidClientService } from './HyperLiquidClientService';
import type { HyperLiquidWalletService } from './HyperLiquidWalletService';
import type { CaipAccountId } from '@metamask/utils';
import { strings } from '../../../../../locales/i18n';

/**
 * Service for managing HyperLiquid WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting
 */
export class HyperLiquidSubscriptionService {
  // Service dependencies
  private clientService: HyperLiquidClientService;
  private walletService: HyperLiquidWalletService;

  // Subscriber collections
  private priceSubscribers = new Map<
    string,
    Set<(prices: PriceUpdate[]) => void>
  >();
  private positionSubscribers = new Set<(positions: Position[]) => void>();
  private orderFillSubscribers = new Set<(fills: OrderFill[]) => void>();
  private orderSubscribers = new Set<(orders: Order[]) => void>();
  private accountSubscribers = new Set<(account: AccountState) => void>();

  // Track which subscribers want market data
  private marketDataSubscribers = new Map<
    string,
    Set<(prices: PriceUpdate[]) => void>
  >();

  // Global singleton subscriptions
  private globalAllMidsSubscription?: Subscription;
  private globalAllMidsPromise?: Promise<void>; // Track in-progress subscription
  private globalActiveAssetSubscriptions = new Map<string, Subscription>();
  private globalL2BookSubscriptions = new Map<string, Subscription>();
  private symbolSubscriberCounts = new Map<string, number>();

  // Shared webData2 subscription for positions and orders
  private sharedWebData2Subscription?: Subscription;
  private webData2SubscriptionPromise?: Promise<void>;
  private positionSubscriberCount = 0;
  private orderSubscriberCount = 0;
  private accountSubscriberCount = 0;

  private cachedPositions: Position[] | null = null;
  private cachedOrders: Order[] | null = null;
  private cachedAccount: AccountState | null = null;
  // Global price data cache
  private cachedPriceData: Map<string, PriceUpdate> | null = null;

  // Order book data cache
  private orderBookCache = new Map<
    string,
    {
      bestBid?: string;
      bestAsk?: string;
      spread?: string;
      lastUpdated: number;
    }
  >();

  // Market data caching for multi-channel consolidation
  private marketDataCache = new Map<
    string,
    {
      prevDayPx?: number;
      funding?: number;
      openInterest?: number;
      volume24h?: number;
      oraclePrice?: number;
      lastUpdated: number;
    }
  >();

  constructor(
    clientService: HyperLiquidClientService,
    walletService: HyperLiquidWalletService,
  ) {
    this.clientService = clientService;
    this.walletService = walletService;
  }

  // updateFundingRatesCache method removed - funding rates now come directly from assetCtx

  /**
   * Subscribe to live price updates with singleton subscription architecture
   * Uses allMids for fast price updates and predictedFundings for accurate funding rates
   */
  public async subscribeToPrices(
    params: SubscribePricesParams,
  ): Promise<() => void> {
    const {
      symbols,
      callback,
      includeOrderBook = false,
      includeMarketData = false,
    } = params;
    const unsubscribers: (() => void)[] = [];

    // Track subscription start time using performance.now()
    const subscriptionStartTime = performance.now();

    // Start trace for subscription
    trace({
      name: TraceName.PerpsMarketDataUpdate,
      op: TraceOperation.PerpsMarketData,
      tags: {
        symbols: symbols.join(','),
        includeMarketData,
        includeOrderBook,
      },
    });

    symbols.forEach((symbol) => {
      unsubscribers.push(
        this.createSubscription(this.priceSubscribers, callback, symbol),
      );
      // Track market data subscribers separately
      if (includeMarketData) {
        unsubscribers.push(
          this.createSubscription(this.marketDataSubscribers, callback, symbol),
        );
      }
    });

    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      DevLogger.log('SubscriptionClient not available for price subscription');
      return () => unsubscribers.forEach((fn) => fn());
    }

    // Ensure global subscriptions are established
    this.ensureGlobalAllMidsSubscription();

    // Cache funding rates from initial market data fetch if available
    if (includeMarketData) {
      // Get initial market data to cache funding rates
      try {
        // Get the provider through the clientService instead of Engine directly
        const infoClient = this.clientService.getInfoClient();
        const [perpsMeta, assetCtxs] = await Promise.all([
          infoClient.meta(),
          infoClient.metaAndAssetCtxs(),
        ]);

        if (perpsMeta?.universe && assetCtxs?.[1]) {
          // Cache funding rates directly from assetCtxs
          perpsMeta.universe.forEach((asset, index) => {
            const assetCtx = assetCtxs[1][index];
            if (assetCtx && 'funding' in assetCtx) {
              const existing = this.marketDataCache.get(asset.name) || {
                lastUpdated: 0,
              };
              this.marketDataCache.set(asset.name, {
                ...existing,
                funding: parseFloat(assetCtx.funding),
                lastUpdated: Date.now(),
              });
            }
          });

          DevLogger.log('🔍 Cached funding rates from initial market data:', {
            cachedCount: perpsMeta.universe.filter((_asset, index) => {
              const assetCtx = assetCtxs[1][index];
              return assetCtx && 'funding' in assetCtx;
            }).length,
            totalMarkets: perpsMeta.universe.length,
          });
        }
      } catch (error) {
        DevLogger.log('Failed to cache initial funding rates:', error);
      }
    }

    symbols.forEach((symbol) => {
      // Subscribe to activeAssetCtx only when market data is requested
      if (includeMarketData) {
        this.ensureActiveAssetSubscription(symbol);
      }
      if (includeOrderBook) {
        this.ensureL2BookSubscription(symbol);
      }
    });

    // Send cached data immediately if available
    symbols.forEach((symbol) => {
      const cachedPrice = this.cachedPriceData?.get(symbol);
      if (cachedPrice) {
        callback([cachedPrice]);
      }
    });

    // Return cleanup function
    return () => {
      unsubscribers.forEach((fn) => fn());
      // Cleanup subscriptions with reference counting
      symbols.forEach((symbol) => {
        if (includeMarketData) {
          this.cleanupActiveAssetSubscription(symbol);
        }
        if (includeOrderBook) {
          this.cleanupL2BookSubscription(symbol);
        }
      });

      // End trace on unsubscribe with correct duration calculation
      endTrace({
        name: TraceName.PerpsMarketDataUpdate,
        data: {
          subscription_duration_ms: performance.now() - subscriptionStartTime,
          symbols_count: symbols.length,
        },
      });
    };
  }

  /**
   * Ensure shared webData2 subscription is active (singleton pattern)
   * This subscription provides both positions and orders data
   */
  private async ensureSharedWebData2Subscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    // Return existing subscription if active
    if (this.sharedWebData2Subscription) {
      return;
    }

    // Return existing promise if subscription is being established
    if (this.webData2SubscriptionPromise) {
      return this.webData2SubscriptionPromise;
    }

    // Create new subscription promise to prevent race conditions
    this.webData2SubscriptionPromise =
      this.createWebData2Subscription(accountId);

    try {
      await this.webData2SubscriptionPromise;
    } catch (error) {
      // Clear promise on error so it can be retried
      this.webData2SubscriptionPromise = undefined;
      throw error;
    }
  }

  /**
   * Create the actual webData2 subscription
   */
  private async createWebData2Subscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (!subscriptionClient) {
      throw new Error(strings('perps.errors.subscriptionClientNotInitialized'));
    }

    const userAddress = await this.walletService.getUserAddressWithDefault(
      accountId,
    );

    return new Promise((resolve, reject) => {
      subscriptionClient
        .webData2({ user: userAddress }, (data: WsWebData2) => {
          // Extract and process positions with TP/SL data
          const positions = data.clearinghouseState.assetPositions
            .filter((assetPos) => assetPos.position.szi !== '0')
            .map((assetPos) => adaptPositionFromSDK(assetPos));

          // Extract TP/SL from openOrders for positions
          const tpslMap = new Map<
            string,
            { takeProfitPrice?: string; stopLossPrice?: string }
          >();

          // Also extract regular orders for order subscribers
          const orders: Order[] = [];

          (data.openOrders || []).forEach((order) => {
            // Process trigger orders for TP/SL
            if (order.triggerPx) {
              const coin = order.coin;
              const position = positions.find((p) => p.coin === coin);

              if (position) {
                const existing = tpslMap.get(coin) || {};
                const isLong = parseFloat(position.size) > 0;

                // Determine if it's TP or SL based on order type
                if (order.orderType?.includes('Take Profit')) {
                  existing.takeProfitPrice = order.triggerPx;
                } else if (order.orderType?.includes('Stop')) {
                  existing.stopLossPrice = order.triggerPx;
                } else {
                  // Fallback: determine based on trigger price vs entry price
                  const triggerPrice = parseFloat(order.triggerPx);
                  const entryPrice = parseFloat(position.entryPrice || '0');

                  if (isLong) {
                    if (triggerPrice > entryPrice) {
                      existing.takeProfitPrice = order.triggerPx;
                    } else {
                      existing.stopLossPrice = order.triggerPx;
                    }
                  } else if (triggerPrice < entryPrice) {
                    existing.takeProfitPrice = order.triggerPx;
                  } else {
                    existing.stopLossPrice = order.triggerPx;
                  }
                }

                tpslMap.set(coin, existing);
              }
            }

            // Convert ALL open orders to Order format using adapter
            // We NO LONGER skip TP/SL orders - they should appear in the orders list too
            // TP/SL orders are both:
            // 1. Used to populate position TP/SL fields (done above)
            // 2. Shown as separate orders in the orders list (done here)
            const convertedOrder = adaptOrderFromSDK(order);
            orders.push(convertedOrder);
          });

          // Merge positions with TP/SL data, ensuring fields are always present
          const positionsWithTPSL = positions.map((position) => {
            const tpsl = tpslMap.get(position.coin) || {};
            return {
              ...position,
              takeProfitPrice: tpsl.takeProfitPrice || undefined,
              stopLossPrice: tpsl.stopLossPrice || undefined,
            };
          });

          // Extract account data from clearinghouseState (with null checks)
          const accountState: AccountState = adaptAccountStateFromSDK(
            data.clearinghouseState,
            data.spotState,
          );

          //TODO: @abretonc7s - We need to revisit this logic for increased performance.
          // Check if data actually changed
          const positionsChanged =
            JSON.stringify(positionsWithTPSL) !==
            JSON.stringify(this.cachedPositions);
          const ordersChanged =
            JSON.stringify(orders) !== JSON.stringify(this.cachedOrders);
          const accountChanged =
            JSON.stringify(accountState) !== JSON.stringify(this.cachedAccount);

          // Only notify position subscribers on first update (when cachedPositions is null) or when data changes
          // This prevents repeated notifications when positions remain empty
          if (positionsChanged) {
            this.cachedPositions = positionsWithTPSL;
            this.positionSubscribers.forEach((callback) => {
              callback(positionsWithTPSL);
            });
          }

          // Only notify order subscribers on first update (when cachedOrders is null) or when data changes
          if (ordersChanged) {
            this.cachedOrders = orders;
            this.orderSubscribers.forEach((callback) => {
              callback(orders);
            });
          }

          if (accountChanged) {
            this.cachedAccount = accountState;
            this.accountSubscribers.forEach((callback) => {
              callback(accountState);
            });
          }
        })
        .then((sub) => {
          this.sharedWebData2Subscription = sub;
          DevLogger.log(
            'Shared webData2 subscription established (single connection for positions + orders)',
          );
          resolve();
        })
        .catch((error) => {
          DevLogger.log(
            'Failed to establish shared webData2 subscription',
            error,
          );
          reject(error instanceof Error ? error : new Error(String(error)));
        });
    });
  }

  /**
   * Clean up shared webData2 subscription when no longer needed
   */
  private cleanupSharedWebData2Subscription(): void {
    const totalSubscribers =
      this.positionSubscriberCount +
      this.orderSubscriberCount +
      this.accountSubscriberCount;

    if (totalSubscribers <= 0 && this.sharedWebData2Subscription) {
      this.sharedWebData2Subscription.unsubscribe().catch((error: Error) => {
        DevLogger.log('Failed to unsubscribe shared webData2', error);
      });
      this.sharedWebData2Subscription = undefined;
      this.webData2SubscriptionPromise = undefined;
      this.positionSubscriberCount = 0;
      this.orderSubscriberCount = 0;
      this.accountSubscriberCount = 0;
      this.cachedPositions = null;
      this.cachedOrders = null;
      this.cachedAccount = null;
      DevLogger.log('Shared webData2 subscription cleaned up');
    }
  }

  /**
   * Subscribe to live position updates with TP/SL data
   */
  public subscribeToPositions(params: SubscribePositionsParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(
      this.positionSubscribers,
      callback,
    );

    // Increment position subscriber count
    this.positionSubscriberCount++;

    // Immediately provide cached data if available
    if (this.cachedPositions) {
      callback(this.cachedPositions);
    }

    // Ensure shared subscription is active
    this.ensureSharedWebData2Subscription(accountId).catch((error) => {
      DevLogger.log(strings('perps.errors.failedToSubscribePosition'), error);
    });

    return () => {
      unsubscribe();
      this.positionSubscriberCount--;
      this.cleanupSharedWebData2Subscription();
    };
  }

  /**
   * Subscribe to live order fill updates
   */
  public subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(
      this.orderFillSubscribers,
      callback,
    );

    let subscription: Subscription | undefined;
    let cancelled = false;

    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (subscriptionClient) {
      this.walletService
        .getUserAddressWithDefault(accountId)
        .then((userAddress) => {
          if (!subscriptionClient) {
            throw new Error(
              strings('perps.errors.subscriptionClientNotInitialized'),
            );
          }

          return subscriptionClient.userFills(
            { user: userAddress },
            (data: WsUserFills) => {
              const orderFills: OrderFill[] = data.fills.map((fill) => ({
                orderId: fill.oid.toString(),
                symbol: fill.coin,
                side: fill.side,
                size: fill.sz,
                price: fill.px,
                fee: fill.fee,
                timestamp: fill.time,
                pnl: fill.closedPnl,
                direction: fill.dir,
                feeToken: fill.feeToken,
                startPosition: fill.startPosition,
              }));

              callback(orderFills);
            },
          );
        })
        .then((sub) => {
          // If cleanup was called before subscription completed, immediately unsubscribe
          if (cancelled) {
            sub.unsubscribe().catch((error: Error) => {
              DevLogger.log(
                strings('perps.errors.failedToUnsubscribeOrderFill'),
                error,
              );
            });
          } else {
            subscription = sub;
          }
        })
        .catch((error) => {
          DevLogger.log(
            strings('perps.errors.failedToSubscribeOrderFill'),
            error,
          );
        });
    }

    return () => {
      cancelled = true;
      unsubscribe();

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          DevLogger.log(
            strings('perps.errors.failedToUnsubscribeOrderFill'),
            error,
          );
        });
      }
    };
  }

  /**
   * Subscribe to live order updates
   * Uses the shared webData2 subscription to avoid duplicate connections
   */
  public subscribeToOrders(params: SubscribeOrdersParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(
      this.orderSubscribers,
      callback,
    );

    // Increment order subscriber count
    this.orderSubscriberCount++;

    // Immediately provide cached data if available
    if (this.cachedOrders) {
      callback(this.cachedOrders);
    }

    // Ensure shared subscription is active
    this.ensureSharedWebData2Subscription(accountId).catch((error) => {
      DevLogger.log(strings('perps.errors.failedToSubscribeOrders'), error);
    });

    return () => {
      unsubscribe();
      this.orderSubscriberCount--;
      this.cleanupSharedWebData2Subscription();
    };
  }

  /**
   * Subscribe to live account updates
   * Uses the shared webData2 subscription to avoid duplicate connections
   */
  public subscribeToAccount(params: SubscribeAccountParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(
      this.accountSubscribers,
      callback,
    );

    // Increment account subscriber count
    this.accountSubscriberCount++;

    // Immediately provide cached data if available
    if (this.cachedAccount) {
      callback(this.cachedAccount);
    }

    // Ensure shared subscription is active (reuses existing connection)
    this.ensureSharedWebData2Subscription(accountId).catch((error) => {
      DevLogger.log(strings('perps.errors.failedToSubscribeAccount'), error);
    });

    return () => {
      unsubscribe();
      this.accountSubscriberCount--;
      this.cleanupSharedWebData2Subscription();
    };
  }

  /**
   * Create subscription with common error handling
   */
  private createSubscription<T>(
    subscribers: Set<T> | Map<string, Set<T>>,
    callback: T,
    key?: string,
  ): () => void {
    if (subscribers instanceof Map && key) {
      if (!subscribers.has(key)) {
        subscribers.set(key, new Set());
      }
      subscribers.get(key)?.add(callback);
    } else if (subscribers instanceof Set) {
      subscribers.add(callback);
    }

    return () => {
      if (subscribers instanceof Map && key) {
        subscribers.get(key)?.delete(callback);
      } else if (subscribers instanceof Set) {
        subscribers.delete(callback);
      }
    };
  }

  /**
   * Helper function to create consolidated price updates with 24h change calculation
   */
  private createPriceUpdate(symbol: string, price: string): PriceUpdate {
    const marketData = this.marketDataCache.get(symbol);
    const orderBookData = this.orderBookCache.get(symbol);
    const currentPrice = parseFloat(price);

    let percentChange24h: string | undefined;
    if (marketData?.prevDayPx) {
      const change =
        ((currentPrice - marketData.prevDayPx) / marketData.prevDayPx) * 100;
      percentChange24h = change.toFixed(2);
    }

    // Check if any subscriber for this symbol wants market data
    const hasMarketDataSubscribers =
      this.marketDataSubscribers.has(symbol) &&
      (this.marketDataSubscribers.get(symbol)?.size ?? 0) > 0;

    const priceUpdate = {
      coin: symbol,
      price, // This is the mid price from allMids
      timestamp: Date.now(),
      percentChange24h,
      // Add mark price from activeAssetCtx
      markPrice: marketData?.oraclePrice
        ? marketData.oraclePrice.toString()
        : undefined,
      // Add order book data if available
      bestBid: orderBookData?.bestBid,
      bestAsk: orderBookData?.bestAsk,
      spread: orderBookData?.spread,
      // Always include funding when available (don't default to 0, preserve undefined)
      funding: marketData?.funding,
      // Add market data only if requested by at least one subscriber
      openInterest: hasMarketDataSubscribers
        ? marketData?.openInterest
        : undefined,
      volume24h: hasMarketDataSubscribers ? marketData?.volume24h : undefined,
    };

    return priceUpdate;
  }

  /**
   * Ensure global allMids subscription is active (singleton pattern)
   */
  private ensureGlobalAllMidsSubscription(): void {
    // Check both the subscription AND the promise to prevent race conditions
    if (this.globalAllMidsSubscription || this.globalAllMidsPromise) {
      return;
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      return;
    }

    // Track WebSocket metrics
    const wsMetrics = {
      messagesReceived: 0,
      lastMessageTime: Date.now(),
      reconnectCount: 0,
      startTime: Date.now(),
    };

    // Store the promise immediately to prevent duplicate calls
    this.globalAllMidsPromise = subscriptionClient
      .allMids((data: WsAllMids) => {
        wsMetrics.messagesReceived++;
        wsMetrics.lastMessageTime = Date.now();

        // Update cache for ALL available symbols
        Object.entries(data.mids).forEach(([symbol, price]) => {
          // Initialize the Map if it doesn't exist
          if (!this.cachedPriceData) {
            this.cachedPriceData = new Map<string, PriceUpdate>();
          }

          const priceUpdate = this.createPriceUpdate(symbol, price.toString());
          this.cachedPriceData.set(symbol, priceUpdate);
        });

        // Always notify price subscribers when we receive price data
        // This ensures subscribers get updates and the UI can display current prices
        this.notifyAllPriceSubscribers();
      })
      .then((sub) => {
        this.globalAllMidsSubscription = sub;
        DevLogger.log('HyperLiquid: Global allMids subscription established');

        // Notify existing subscribers with any cached data now that subscription is established
        if (this.cachedPriceData && this.cachedPriceData.size > 0) {
          this.notifyAllPriceSubscribers();
        }

        // Trace WebSocket connection
        trace({
          name: TraceName.PerpsWebSocketConnected,
          op: TraceOperation.PerpsMarketData,
          tags: {
            subscription_type: 'allMids',
            is_testnet: this.clientService.isTestnetMode(),
          },
        });
      })
      .catch((error) => {
        // Clear the promise on error so it can be retried
        this.globalAllMidsPromise = undefined;

        DevLogger.log(strings('perps.errors.failedToEstablishAllMids'), error);

        // Trace WebSocket error
        trace({
          name: TraceName.PerpsWebSocketDisconnected,
          op: TraceOperation.PerpsMarketData,
          tags: {
            subscription_type: 'allMids',
            error: error.message,
          },
        });
      });
  }

  /**
   * Ensure activeAssetCtx subscription for specific symbol (with reference counting)
   */
  private ensureActiveAssetSubscription(symbol: string): void {
    // Increment subscriber count
    const currentCount = this.symbolSubscriberCounts.get(symbol) || 0;
    this.symbolSubscriberCounts.set(symbol, currentCount + 1);

    // If subscription already exists, just return
    if (this.globalActiveAssetSubscriptions.has(symbol)) {
      return;
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      return;
    }

    // Track metrics for this subscription
    const subscriptionMetrics = {
      messagesReceived: 0,
      startTime: Date.now(),
    };

    subscriptionClient
      .activeAssetCtx(
        { coin: symbol },
        (data: WsActiveAssetCtx | WsActiveSpotAssetCtx) => {
          subscriptionMetrics.messagesReceived++;

          if (data.coin === symbol && data.ctx) {
            const ctx = data.ctx;

            // Type guard to determine if this is perps or spot context
            const isPerpsContext = (
              context: typeof data.ctx,
            ): context is PerpsAssetCtx =>
              'funding' in context &&
              'openInterest' in context &&
              'oraclePx' in context;

            // Cache market data for consolidation with price updates
            const marketData = {
              prevDayPx: parseFloat(ctx.prevDayPx?.toString() || '0'),
              // Cache funding rate from activeAssetCtx for real-time updates
              funding:
                isPerpsContext(ctx) && ctx.funding !== undefined
                  ? parseFloat(ctx.funding.toString())
                  : undefined,
              // Convert openInterest from token units to USD by multiplying by current price
              // Note: openInterest from API is in token units (e.g., BTC), while volume is already in USD
              openInterest: isPerpsContext(ctx)
                ? parseFloat(ctx.openInterest?.toString() || '0') *
                  parseFloat(
                    ctx.midPx?.toString() || ctx.markPx?.toString() || '0',
                  )
                : 0,
              volume24h: parseFloat(ctx.dayNtlVlm?.toString() || '0'),
              oraclePrice: isPerpsContext(ctx)
                ? parseFloat(ctx.oraclePx?.toString() || '0')
                : 0,
              lastUpdated: Date.now(),
            };

            this.marketDataCache.set(symbol, marketData);

            // Update cached price data with new 24h change if we have current price
            const currentCachedPrice = this.cachedPriceData?.get(symbol);
            if (currentCachedPrice) {
              const updatedPrice = this.createPriceUpdate(
                symbol,
                currentCachedPrice.price,
              );

              // Ensure the Map exists
              if (!this.cachedPriceData) {
                this.cachedPriceData = new Map<string, PriceUpdate>();
              }

              this.cachedPriceData.set(symbol, updatedPrice);
              this.notifyAllPriceSubscribers();
            }
          }
        },
      )
      .then((sub) => {
        this.globalActiveAssetSubscriptions.set(symbol, sub);
        DevLogger.log(
          `HyperLiquid: Market data subscription established for ${symbol}`,
        );
        // Trace WebSocket connection for market data
        trace({
          name: TraceName.PerpsWebSocketConnected,
          op: TraceOperation.PerpsMarketData,
          tags: {
            subscription_type: 'activeAssetCtx',
            symbol,
            is_testnet: this.clientService.isTestnetMode(),
          },
        });
      })
      .catch((error) => {
        DevLogger.log(
          strings('perps.errors.failedToEstablishMarketData', { symbol }),
          error,
        );

        // Trace WebSocket error
        trace({
          name: TraceName.PerpsWebSocketDisconnected,
          op: TraceOperation.PerpsMarketData,
          tags: {
            subscription_type: 'activeAssetCtx',
            symbol,
            error: error.message,
          },
        });
      });
  }

  /**
   * Cleanup activeAssetCtx subscription when no longer needed
   */
  private cleanupActiveAssetSubscription(symbol: string): void {
    const currentCount = this.symbolSubscriberCounts.get(symbol) || 0;
    if (currentCount <= 1) {
      // Last subscriber, cleanup subscription
      const subscription = this.globalActiveAssetSubscriptions.get(symbol);
      if (subscription) {
        subscription.unsubscribe().catch(console.error);
        this.globalActiveAssetSubscriptions.delete(symbol);
        this.symbolSubscriberCounts.delete(symbol);
        DevLogger.log(
          `HyperLiquid: Cleaned up market data subscription for ${symbol}`,
        );
      }
    } else {
      // Still has subscribers, just decrement count
      this.symbolSubscriberCounts.set(symbol, currentCount - 1);
    }
  }

  /**
   * Ensure L2 book subscription for specific symbol (with reference counting)
   */
  private ensureL2BookSubscription(symbol: string): void {
    // If subscription already exists, just return
    if (this.globalL2BookSubscriptions.has(symbol)) {
      return;
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      return;
    }

    subscriptionClient
      .l2Book({ coin: symbol, nSigFigs: 5 }, (data: Book) => {
        if (data.coin === symbol && data.levels) {
          // Extract best bid and ask from order book
          const bestBid = data.levels[0]?.[0]; // First bid level
          const bestAsk = data.levels[1]?.[0]; // First ask level

          if (bestBid || bestAsk) {
            const bidPrice = bestBid ? parseFloat(bestBid.px) : 0;
            const askPrice = bestAsk ? parseFloat(bestAsk.px) : 0;
            const spread =
              bidPrice > 0 && askPrice > 0
                ? (askPrice - bidPrice).toFixed(5)
                : undefined;

            // Update order book cache
            this.orderBookCache.set(symbol, {
              bestBid: bestBid?.px,
              bestAsk: bestAsk?.px,
              spread,
              lastUpdated: Date.now(),
            });

            // Update cached price data with new order book data
            const currentCachedPrice = this.cachedPriceData?.get(symbol);
            if (currentCachedPrice) {
              const updatedPrice = this.createPriceUpdate(
                symbol,
                currentCachedPrice.price,
              );

              // Ensure the Map exists
              if (!this.cachedPriceData) {
                this.cachedPriceData = new Map<string, PriceUpdate>();
              }

              this.cachedPriceData.set(symbol, updatedPrice);
              this.notifyAllPriceSubscribers();
            }
          }
        }
      })
      .then((sub) => {
        this.globalL2BookSubscriptions.set(symbol, sub);
        DevLogger.log(
          `HyperLiquid: L2 book subscription established for ${symbol}`,
        );
      })
      .catch((error) => {
        DevLogger.log(
          `HyperLiquid: Failed to establish L2 book subscription for ${symbol}`,
          error,
        );
      });
  }

  /**
   * Cleanup L2 book subscription when no longer needed
   */
  private cleanupL2BookSubscription(symbol: string): void {
    const subscription = this.globalL2BookSubscriptions.get(symbol);
    if (subscription) {
      subscription.unsubscribe().catch(console.error);
      this.globalL2BookSubscriptions.delete(symbol);
      this.orderBookCache.delete(symbol);
      DevLogger.log(
        `HyperLiquid: Cleaned up L2 book subscription for ${symbol}`,
      );
    }
  }

  /**
   * Notify all price subscribers with their requested symbols from cache
   * Optimized to batch updates per subscriber
   */
  private notifyAllPriceSubscribers(): void {
    // If no price data exists yet, don't notify
    if (!this.cachedPriceData) {
      return;
    }

    const priceData = this.cachedPriceData;

    // Group updates by subscriber to batch notifications
    const subscriberUpdates = new Map<
      (prices: PriceUpdate[]) => void,
      PriceUpdate[]
    >();

    this.priceSubscribers.forEach((subscriberSet, symbol) => {
      const priceUpdate = priceData.get(symbol);
      if (priceUpdate) {
        subscriberSet.forEach((callback) => {
          if (!subscriberUpdates.has(callback)) {
            subscriberUpdates.set(callback, []);
          }
          const updates = subscriberUpdates.get(callback);
          if (updates) {
            updates.push(priceUpdate);
          }
        });
      }
    });

    // Send batched updates to each subscriber
    subscriberUpdates.forEach((updates, callback) => {
      if (updates.length > 0) {
        callback(updates);
      }
    });
  }

  /**
   * Clear all subscriptions and cached data
   */
  public clearAll(): void {
    // Clear all local subscriber collections
    this.priceSubscribers.clear();
    this.positionSubscribers.clear();
    this.orderFillSubscribers.clear();
    this.orderSubscribers.clear();
    this.accountSubscribers.clear();
    this.marketDataSubscribers.clear();

    // Clear cached data
    this.cachedPriceData = null;
    this.cachedPositions = null;
    this.cachedOrders = null;
    this.cachedAccount = null;
    this.marketDataCache.clear();
    this.orderBookCache.clear();
    this.symbolSubscriberCounts.clear();

    // Clear subscription references (actual cleanup handled by client service)
    this.globalAllMidsSubscription = undefined;
    this.globalActiveAssetSubscriptions.clear();
    this.globalL2BookSubscriptions.clear();
    this.sharedWebData2Subscription = undefined;
    this.webData2SubscriptionPromise = undefined;

    DevLogger.log('HyperLiquid: Subscription service cleared', {
      timestamp: new Date().toISOString(),
    });
  }
}
