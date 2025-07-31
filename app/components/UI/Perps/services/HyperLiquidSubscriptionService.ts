import {
  type Subscription,
  type WsAllMids,
  type WsWebData2,
  type WsUserFills,
  type WsActiveAssetCtx,
  type WsActiveSpotAssetCtx,
  type PerpsAssetCtx,
} from '@deeeed/hyperliquid-node20';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import type {
  PriceUpdate,
  Position,
  OrderFill,
  SubscribePricesParams,
  SubscribePositionsParams,
  SubscribeOrderFillsParams,
} from '../controllers/types';
import { adaptPositionFromSDK } from '../utils/hyperLiquidAdapter';
import type { HyperLiquidClientService } from './HyperLiquidClientService';
import type { HyperLiquidWalletService } from './HyperLiquidWalletService';

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

  // Global singleton subscriptions
  private globalAllMidsSubscription?: Subscription;
  private globalActiveAssetSubscriptions = new Map<string, Subscription>();
  private symbolSubscriberCounts = new Map<string, number>();

  // Global price data cache
  private cachedPriceData = new Map<string, PriceUpdate>();

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

  /**
   * Subscribe to live price updates with singleton subscription architecture
   * Uses allMids for fast price updates and activeAssetCtx for market data
   */
  public subscribeToPrices(params: SubscribePricesParams): () => void {
    const { symbols, callback } = params;
    const unsubscribers: (() => void)[] = [];

    symbols.forEach((symbol) => {
      unsubscribers.push(
        this.createSubscription(this.priceSubscribers, callback, symbol),
      );
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
    symbols.forEach((symbol) => {
      this.ensureActiveAssetSubscription(symbol);
    });

    // Send cached data immediately if available
    symbols.forEach((symbol) => {
      const cachedPrice = this.cachedPriceData.get(symbol);
      if (cachedPrice) {
        callback([cachedPrice]);
      }
    });

    // Return cleanup function
    return () => {
      unsubscribers.forEach((fn) => fn());
      // Cleanup active asset subscriptions with reference counting
      symbols.forEach((symbol) => {
        this.cleanupActiveAssetSubscription(symbol);
      });
    };
  }

  /**
   * Subscribe to live position updates
   */
  public subscribeToPositions(params: SubscribePositionsParams): () => void {
    const { callback, accountId } = params;
    const unsubscribe = this.createSubscription(
      this.positionSubscribers,
      callback,
    );

    let subscription: Subscription | undefined;

    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (subscriptionClient) {
      this.walletService
        .getUserAddressWithDefault(accountId)
        .then((userAddress) => {
          if (!subscriptionClient) {
            throw new Error('SubscriptionClient is not initialized');
          }

          return subscriptionClient.webData2(
            { user: userAddress },
            (data: WsWebData2) => {
              if (data.clearinghouseState.assetPositions) {
                const positions: Position[] =
                  data.clearinghouseState.assetPositions
                    .filter((assetPos) => assetPos.position.szi !== '0')
                    .map((assetPos) => adaptPositionFromSDK(assetPos));

                callback(positions);
              }
            },
          );
        })
        .then((sub) => {
          subscription = sub;
        })
        .catch((error) => {
          DevLogger.log('Failed to subscribe to position updates:', error);
        });
    }

    return () => {
      unsubscribe();

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          DevLogger.log('Failed to unsubscribe from position updates:', error);
        });
      }
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

    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (subscriptionClient) {
      this.walletService
        .getUserAddressWithDefault(accountId)
        .then((userAddress) => {
          if (!subscriptionClient) {
            throw new Error('SubscriptionClient is not initialized');
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
              }));

              callback(orderFills);
            },
          );
        })
        .then((sub) => {
          subscription = sub;
        })
        .catch((error) => {
          DevLogger.log('Failed to subscribe to order fill updates:', error);
        });
    }

    return () => {
      unsubscribe();

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          DevLogger.log(
            'Failed to unsubscribe from order fill updates:',
            error,
          );
        });
      }
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
    const currentPrice = parseFloat(price);

    let percentChange24h: string | undefined;
    if (marketData?.prevDayPx) {
      const change =
        ((currentPrice - marketData.prevDayPx) / marketData.prevDayPx) * 100;
      percentChange24h = change.toFixed(2);
    }

    return {
      coin: symbol,
      price,
      timestamp: Date.now(),
      percentChange24h,
    };
  }

  /**
   * Ensure global allMids subscription is active (singleton pattern)
   */
  private ensureGlobalAllMidsSubscription(): void {
    if (this.globalAllMidsSubscription) {
      return;
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      return;
    }

    subscriptionClient
      .allMids((data: WsAllMids) => {
        // Update cache for ALL available symbols
        Object.entries(data.mids).forEach(([symbol, price]) => {
          const priceUpdate = this.createPriceUpdate(symbol, price.toString());
          this.cachedPriceData.set(symbol, priceUpdate);
        });

        // Notify all price subscribers with their requested symbols
        this.notifyAllPriceSubscribers();
      })
      .then((sub) => {
        this.globalAllMidsSubscription = sub;
        DevLogger.log('HyperLiquid: Global allMids subscription established');
      })
      .catch((error) => {
        DevLogger.log(
          'HyperLiquid: Failed to establish global allMids subscription:',
          error,
        );
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

    subscriptionClient
      .activeAssetCtx(
        { coin: symbol },
        (data: WsActiveAssetCtx | WsActiveSpotAssetCtx) => {
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
              funding: isPerpsContext(ctx)
                ? parseFloat(ctx.funding?.toString() || '0')
                : 0,
              openInterest: isPerpsContext(ctx)
                ? parseFloat(ctx.openInterest?.toString() || '0')
                : 0,
              volume24h: parseFloat(ctx.dayNtlVlm?.toString() || '0'),
              oraclePrice: isPerpsContext(ctx)
                ? parseFloat(ctx.oraclePx?.toString() || '0')
                : 0,
              lastUpdated: Date.now(),
            };

            this.marketDataCache.set(symbol, marketData);

            // Update cached price data with new 24h change if we have current price
            const currentCachedPrice = this.cachedPriceData.get(symbol);
            if (currentCachedPrice) {
              const updatedPrice = this.createPriceUpdate(
                symbol,
                currentCachedPrice.price,
              );
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
      })
      .catch((error) => {
        DevLogger.log(
          `HyperLiquid: Failed to establish market data subscription for ${symbol}:`,
          error,
        );
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
   * Notify all price subscribers with their requested symbols from cache
   */
  private notifyAllPriceSubscribers(): void {
    this.priceSubscribers.forEach((subscriberSet, symbol) => {
      const priceUpdate = this.cachedPriceData.get(symbol);
      if (priceUpdate) {
        subscriberSet.forEach((callback) => {
          callback([priceUpdate]);
        });
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

    // Clear cached data
    this.cachedPriceData.clear();
    this.marketDataCache.clear();
    this.symbolSubscriberCounts.clear();

    // Clear subscription references (actual cleanup handled by client service)
    this.globalAllMidsSubscription = undefined;
    this.globalActiveAssetSubscriptions.clear();

    DevLogger.log('HyperLiquid: Subscription service cleared', {
      timestamp: new Date().toISOString(),
    });
  }
}
