import {
  type Subscription,
  type WsAllMidsEvent,
  type WsWebData2Event,
  type WsUserFillsEvent,
  type WsActiveAssetCtxEvent,
  type WsActiveSpotAssetCtxEvent,
  type L2BookResponse,
  type WsAssetCtxsEvent,
  type WsClearinghouseStateEvent,
  type FrontendOpenOrdersResponse,
} from '@nktkas/hyperliquid';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
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
  parseAssetName,
} from '../utils/hyperLiquidAdapter';
import type { HyperLiquidClientService } from './HyperLiquidClientService';
import type { HyperLiquidWalletService } from './HyperLiquidWalletService';
import type { CaipAccountId } from '@metamask/utils';
import { TP_SL_CONFIG, PERPS_CONSTANTS } from '../constants/perpsConfig';
import { ensureError } from '../utils/perpsErrorHandler';
import { processL2BookData } from '../utils/hyperLiquidOrderBookProcessor';

/**
 * Service for managing HyperLiquid WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting
 */
export class HyperLiquidSubscriptionService {
  // Service dependencies
  private readonly clientService: HyperLiquidClientService;
  private readonly walletService: HyperLiquidWalletService;

  // HIP-3 feature flag support
  private equityEnabled: boolean;
  private enabledDexs: string[];

  // Subscriber collections
  private readonly priceSubscribers = new Map<
    string,
    Set<(prices: PriceUpdate[]) => void>
  >();
  private readonly positionSubscribers = new Set<
    (positions: Position[]) => void
  >();
  private readonly orderFillSubscribers = new Set<
    (fills: OrderFill[]) => void
  >();
  private readonly orderSubscribers = new Set<(orders: Order[]) => void>();
  private readonly accountSubscribers = new Set<
    (account: AccountState) => void
  >();

  // Track which subscribers want market data
  private readonly marketDataSubscribers = new Map<
    string,
    Set<(prices: PriceUpdate[]) => void>
  >();

  // Global singleton subscriptions
  private globalAllMidsSubscription?: Subscription;
  private globalAllMidsPromise?: Promise<void>; // Track in-progress subscription
  private readonly globalActiveAssetSubscriptions = new Map<
    string,
    Subscription
  >();
  private readonly globalL2BookSubscriptions = new Map<string, Subscription>();
  private readonly symbolSubscriberCounts = new Map<string, number>();
  private readonly dexSubscriberCounts = new Map<string, number>(); // Track subscribers per DEX for assetCtxs

  // Multi-DEX webData2 subscriptions for positions and orders (HIP-3 support)
  private readonly webData2Subscriptions = new Map<string, Subscription>(); // Key: dex name ('' for main)
  private webData2SubscriptionPromise?: Promise<void>;
  private positionSubscriberCount = 0;
  private orderSubscriberCount = 0;
  private accountSubscriberCount = 0;

  // Multi-DEX data caches
  private readonly dexPositionsCache = new Map<string, Position[]>(); // Per-DEX positions
  private readonly dexOrdersCache = new Map<string, Order[]>(); // Per-DEX orders
  private readonly dexAccountCache = new Map<string, AccountState>(); // Per-DEX account state
  private cachedPositions: Position[] | null = null; // Aggregated positions
  private cachedOrders: Order[] | null = null; // Aggregated orders
  private cachedAccount: AccountState | null = null; // Aggregated account
  // Global price data cache
  private cachedPriceData: Map<string, PriceUpdate> | null = null;

  // HIP-3: assetCtxs subscriptions for multi-DEX market data
  private readonly assetCtxsSubscriptions = new Map<string, Subscription>(); // Key: dex name ('' for main)
  private readonly dexAssetCtxsCache = new Map<
    string,
    WsAssetCtxsEvent['ctxs']
  >(); // Per-DEX asset contexts
  private assetCtxsSubscriptionPromises = new Map<string, Promise<void>>(); // Track in-progress subscriptions

  // HIP-3: clearinghouseState subscriptions for multi-DEX account states
  private readonly clearinghouseStateSubscriptions = new Map<
    string,
    Subscription
  >(); // Key: dex name
  private clearinghouseStateSubscriptionPromises = new Map<
    string,
    Promise<void>
  >(); // Track in-progress

  // Order book data cache
  private readonly orderBookCache = new Map<
    string,
    {
      bestBid?: string;
      bestAsk?: string;
      spread?: string;
      lastUpdated: number;
    }
  >();

  // Market data caching for multi-channel consolidation
  private readonly marketDataCache = new Map<
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
    equityEnabled?: boolean,
    enabledDexs?: string[],
  ) {
    this.clientService = clientService;
    this.walletService = walletService;
    this.equityEnabled = equityEnabled ?? false;
    this.enabledDexs = enabledDexs ?? [];
  }

  /**
   * Generate standardized error context for Sentry logging
   */
  private getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): Record<string, unknown> {
    return {
      feature: PERPS_CONSTANTS.FEATURE_NAME,
      context: `HyperLiquidSubscriptionService.${method}`,
      provider: 'hyperliquid',
      network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      ...extra,
    };
  }

  /**
   * Get list of enabled DEXs based on feature flags
   * Returns array with null for main DEX and strings for HIP-3 DEXs
   * HIP-3 support: When equityEnabled is false, returns only main DEX
   */
  private getEnabledDexs(): (string | null)[] {
    if (!this.equityEnabled) {
      return [null]; // Main DEX only
    }
    // Main DEX + all enabled HIP-3 DEXs
    return [null, ...this.enabledDexs];
  }

  /**
   * Update feature flags for HIP-3 support
   * Called when provider discovers new DEXs at runtime
   * Establishes subscriptions for newly enabled DEXs
   */
  public async updateFeatureFlags(
    equityEnabled: boolean,
    enabledDexs: string[],
  ): Promise<void> {
    const previousDexs = [...this.enabledDexs];
    const previousEquityEnabled = this.equityEnabled;

    this.equityEnabled = equityEnabled;
    this.enabledDexs = enabledDexs;

    DevLogger.log('Feature flags updated:', {
      previousEquityEnabled,
      equityEnabled,
      previousDexs,
      enabledDexs,
    });

    // If equity was just enabled or new DEXs were added
    const newDexs = enabledDexs.filter((dex) => !previousDexs.includes(dex));
    if (
      (!previousEquityEnabled && equityEnabled && enabledDexs.length > 0) ||
      newDexs.length > 0
    ) {
      DevLogger.log('Establishing subscriptions for new DEXs:', newDexs);

      // Establish assetCtxs subscriptions for new DEXs (for market data)
      const hasMarketDataSubscribers = this.marketDataSubscribers.size > 0;
      if (hasMarketDataSubscribers) {
        await Promise.all(
          newDexs.map(async (dex) => {
            try {
              await this.ensureAssetCtxsSubscription(dex);
            } catch (error) {
              Logger.error(
                ensureError(error),
                this.getErrorContext(
                  'updateFeatureFlags.ensureAssetCtxsSubscription',
                  {
                    dex,
                  },
                ),
              );
            }
          }),
        );
      }

      // Establish clearinghouseState subscriptions for new DEXs (for positions/account)
      const hasPositionOrAccountSubscribers =
        this.positionSubscriberCount > 0 || this.accountSubscriberCount > 0;
      if (hasPositionOrAccountSubscribers) {
        try {
          const userAddress =
            await this.walletService.getUserAddressWithDefault();
          await Promise.all(
            newDexs.map(async (dex) => {
              try {
                await this.ensureClearinghouseStateSubscription(
                  userAddress,
                  dex,
                );
              } catch (error) {
                Logger.error(
                  ensureError(error),
                  this.getErrorContext(
                    'updateFeatureFlags.ensureClearinghouseStateSubscription',
                    {
                      dex,
                    },
                  ),
                );
              }
            }),
          );
        } catch (error) {
          Logger.error(
            ensureError(error),
            this.getErrorContext('updateFeatureFlags.getUserAddress'),
          );
        }
      }
    }
  }

  /**
   * Fast hash function for change detection
   * Uses string concatenation of key fields instead of JSON.stringify()
   * Performance: ~100x faster than JSON.stringify() for typical objects
   * Only tracks structural changes (coin, size, entryPrice, leverage)
   * Value-based changes like unrealizedPnl should not trigger notifications
   */
  private hashPositions(positions: Position[]): string {
    if (!positions || positions.length === 0) return '0';
    return positions
      .map(
        (p) =>
          `${p.coin}:${p.size}:${p.entryPrice}:${p.leverage.value}:${
            p.takeProfitPrice || ''
          }:${p.stopLossPrice || ''}`,
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

  // Cache hashes to avoid recomputation
  private cachedPositionsHash = '';
  private cachedOrdersHash = '';
  private cachedAccountHash = '';

  /**
   * Extract TP/SL data from open orders and process orders
   * DRY helper used by both webData2 and clearinghouseState callbacks
   *
   * @param orders - Raw SDK orders from WebSocket event
   * @param positions - Current positions for TP/SL matching
   * @returns Maps for TP/SL prices and counts, plus processed Order array
   */
  private extractTPSLFromOrders(
    orders: FrontendOpenOrdersResponse,
    positions: Position[],
  ): {
    tpslMap: Map<string, { takeProfitPrice?: string; stopLossPrice?: string }>;
    tpslCountMap: Map<
      string,
      { takeProfitCount?: number; stopLossCount?: number }
    >;
    processedOrders: Order[];
  } {
    const tpslMap = new Map<
      string,
      { takeProfitPrice?: string; stopLossPrice?: string }
    >();

    const tpslCountMap = new Map<
      string,
      { takeProfitCount?: number; stopLossCount?: number }
    >();

    const processedOrders: Order[] = [];

    orders.forEach((order) => {
      let position: Position | undefined;
      let positionForCoin: Position | undefined;

      const matchPositionToTpsl = (p: Position) => {
        if (TP_SL_CONFIG.USE_POSITION_BOUND_TPSL) {
          return (
            p.coin === order.coin && order.reduceOnly && order.isPositionTpsl
          );
        }

        return (
          p.coin === order.coin &&
          Math.abs(parseFloat(order.sz)) >= Math.abs(parseFloat(p.size))
        );
      };

      const matchPositionToCoin = (p: Position) => p.coin === order.coin;

      // Process trigger orders for TP/SL extraction
      if (order.triggerPx) {
        const isTakeProfit = order.orderType?.includes('Take Profit');
        const isStop = order.orderType?.includes('Stop');
        const currentTakeProfitCount =
          tpslCountMap.get(order.coin)?.takeProfitCount || 0;
        const currentStopLossCount =
          tpslCountMap.get(order.coin)?.stopLossCount || 0;

        tpslCountMap.set(order.coin, {
          takeProfitCount: isTakeProfit
            ? currentTakeProfitCount + 1
            : currentTakeProfitCount,
          stopLossCount: isStop
            ? currentStopLossCount + 1
            : currentStopLossCount,
        });

        const coin = order.coin;
        position = positions.find(matchPositionToTpsl);
        positionForCoin = positions.find(matchPositionToCoin);

        if (position) {
          const existing = tpslMap.get(coin) || {};
          const isLong = parseFloat(position.size) > 0;

          // Determine if it's TP or SL based on order type
          if (isTakeProfit) {
            existing.takeProfitPrice = order.triggerPx;
          } else if (isStop) {
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

      // Convert ALL open orders to Order format
      const convertedOrder = adaptOrderFromSDK(
        order,
        position || positionForCoin,
      );
      processedOrders.push(convertedOrder);
    });

    return { tpslMap, tpslCountMap, processedOrders };
  }

  /**
   * Merge TP/SL data into positions
   * DRY helper used by both webData2 and clearinghouseState callbacks
   *
   * @param positions - Base positions without TP/SL
   * @param tpslMap - Map of coin -> TP/SL prices
   * @param tpslCountMap - Map of coin -> TP/SL counts
   * @returns Positions enhanced with TP/SL data
   */
  private mergeTPSLIntoPositions(
    positions: Position[],
    tpslMap: Map<string, { takeProfitPrice?: string; stopLossPrice?: string }>,
    tpslCountMap: Map<
      string,
      { takeProfitCount?: number; stopLossCount?: number }
    >,
  ): Position[] {
    return positions.map((position) => {
      const tpsl = tpslMap.get(position.coin) || {};
      const tpslCount = tpslCountMap.get(position.coin) || {};
      return {
        ...position,
        takeProfitPrice: tpsl.takeProfitPrice || undefined,
        stopLossPrice: tpsl.stopLossPrice || undefined,
        takeProfitCount: tpslCount.takeProfitCount || 0,
        stopLossCount: tpslCount.stopLossCount || 0,
      };
    });
  }

  /**
   * Aggregate account states from all enabled DEXs
   * Sums balances and creates per-DEX breakdown for multi-DEX portfolio view
   * @returns Aggregated account state with dexBreakdown field
   * @private
   */
  private aggregateAccountStates(): AccountState {
    const dexBreakdown: Record<
      string,
      { availableBalance: string; totalBalance: string }
    > = {};
    let totalAvailableBalance = 0;
    let totalBalance = 0;
    let totalMarginUsed = 0;
    let totalUnrealizedPnl = 0;

    this.dexAccountCache.forEach((state, currentDex) => {
      const dexKey = currentDex === '' ? 'main' : currentDex;
      dexBreakdown[dexKey] = {
        availableBalance: state.availableBalance,
        totalBalance: state.totalBalance,
      };
      totalAvailableBalance += parseFloat(state.availableBalance);
      totalBalance += parseFloat(state.totalBalance);
      totalMarginUsed += parseFloat(state.marginUsed);
      totalUnrealizedPnl += parseFloat(state.unrealizedPnl);
    });

    // Use first DEX's account state as base and override aggregated values
    const firstDexAccount =
      this.dexAccountCache.values().next().value || ({} as AccountState);

    return {
      ...firstDexAccount,
      availableBalance: totalAvailableBalance.toString(),
      totalBalance: totalBalance.toString(),
      marginUsed: totalMarginUsed.toString(),
      unrealizedPnl: totalUnrealizedPnl.toString(),
      dexBreakdown,
    };
  }

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

    // HIP-3: Establish assetCtxs subscriptions ONLY for DEXs with requested symbols
    // Performance: Avoid unnecessary WebSocket connections for unused DEXs
    if (includeMarketData) {
      // Extract unique DEXs from requested symbols
      const dexsNeeded = new Set<string | null>();
      symbols.forEach((symbol) => {
        const { dex } = parseAssetName(symbol);
        dexsNeeded.add(dex);
      });

      // Only subscribe to DEXs that have requested symbols
      dexsNeeded.forEach((dex) => {
        const dexName = dex ?? '';
        this.ensureAssetCtxsSubscription(dexName).catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext(
              'subscribeToPrices.ensureAssetCtxsSubscription',
              { dex: dexName },
            ),
          );
        });
      });
    }

    // Cache funding rates from initial market data fetch if available (legacy fallback)
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

          DevLogger.log('Cached funding rates from initial market data:', {
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

      // Cleanup DEX-level assetCtxs subscriptions
      if (includeMarketData) {
        // Extract unique DEXs from requested symbols
        const dexsNeeded = new Set<string | null>();
        symbols.forEach((symbol) => {
          const { dex } = parseAssetName(symbol);
          dexsNeeded.add(dex);
        });

        // Cleanup assetCtxs subscription for each DEX
        dexsNeeded.forEach((dex) => {
          const dexName = dex ?? '';
          this.cleanupAssetCtxsSubscription(dexName);
        });
      }
    };
  }

  /**
   * Ensure shared webData2 subscription is active (singleton pattern with multi-DEX support)
   * For main DEX: uses webData2 (richer data with orders)
   * For HIP-3 DEXs: uses clearinghouseState (positions and account state only)
   */
  private async ensureSharedWebData2Subscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    const enabledDexs = this.getEnabledDexs();
    const userAddress = await this.walletService.getUserAddressWithDefault(
      accountId,
    );

    // Establish webData2 subscription for main DEX (if not exists)
    if (!this.webData2Subscriptions.has('')) {
      if (!this.webData2SubscriptionPromise) {
        this.webData2SubscriptionPromise =
          this.createWebData2Subscription(accountId);

        try {
          await this.webData2SubscriptionPromise;
        } catch (error) {
          this.webData2SubscriptionPromise = undefined;
          throw error;
        }
      } else {
        await this.webData2SubscriptionPromise;
      }
    }

    // HIP-3: Establish clearinghouseState subscriptions for HIP-3 DEXs
    const hip3Dexs = enabledDexs.filter((dex): dex is string => dex !== null);
    await Promise.all(
      hip3Dexs.map(async (dex) => {
        const dexName = dex;
        try {
          await this.ensureClearinghouseStateSubscription(userAddress, dexName);
        } catch (error) {
          Logger.error(
            ensureError(error),
            this.getErrorContext(
              'ensureSharedWebData2Subscription.clearinghouseState',
              {
                dex: dexName,
              },
            ),
          );
        }
      }),
    );
  }

  /**
   * Create webData2 subscription for the main DEX only
   *
   * NOTE: HyperLiquid SDK's webData2() only supports the main DEX (no dex parameter).
   * For HIP-3 DEX position/order data, use REST API polling via getAccountState().
   */
  private async createWebData2Subscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const userAddress = await this.walletService.getUserAddressWithDefault(
      accountId,
    );

    // Only subscribe to main DEX (webData2 doesn't support dex parameter)
    const dexName = ''; // Main DEX

    // Skip if subscription already exists
    if (this.webData2Subscriptions.has(dexName)) {
      return;
    }

    return new Promise<void>((resolve, reject) => {
      subscriptionClient
        .webData2({ user: userAddress }, (data: WsWebData2Event) => {
          // Extract and process positions for this DEX
          const positions = data.clearinghouseState.assetPositions
            .filter((assetPos) => assetPos.position.szi !== '0')
            .map((assetPos) => adaptPositionFromSDK(assetPos));

          // Extract TP/SL from orders and process orders using shared helper
          const {
            tpslMap,
            tpslCountMap,
            processedOrders: orders,
          } = this.extractTPSLFromOrders(data.openOrders || [], positions);

          // Merge TP/SL data into positions using shared helper
          const positionsWithTPSL = this.mergeTPSLIntoPositions(
            positions,
            tpslMap,
            tpslCountMap,
          );

          // Extract account data for this DEX
          const accountState: AccountState = adaptAccountStateFromSDK(
            data.clearinghouseState,
            data.spotState,
          );

          // Store per-DEX data in caches
          this.dexPositionsCache.set(dexName, positionsWithTPSL);
          this.dexOrdersCache.set(dexName, orders);
          this.dexAccountCache.set(dexName, accountState);

          // Aggregate data from all DEX caches
          const aggregatedPositions = Array.from(
            this.dexPositionsCache.values(),
          ).flat();
          const aggregatedOrders = Array.from(
            this.dexOrdersCache.values(),
          ).flat();
          const aggregatedAccount = this.aggregateAccountStates();

          // Check if aggregated data changed using fast hash comparison
          const positionsHash = this.hashPositions(aggregatedPositions);
          const ordersHash = this.hashOrders(aggregatedOrders);
          const accountHash = this.hashAccountState(aggregatedAccount);

          const positionsChanged = positionsHash !== this.cachedPositionsHash;
          const ordersChanged = ordersHash !== this.cachedOrdersHash;
          const accountChanged = accountHash !== this.cachedAccountHash;

          // Only notify subscribers if aggregated data changed
          if (positionsChanged) {
            this.cachedPositions = aggregatedPositions;
            this.cachedPositionsHash = positionsHash;
            this.positionSubscribers.forEach((callback) => {
              callback(aggregatedPositions);
            });
          }

          if (ordersChanged) {
            this.cachedOrders = aggregatedOrders;
            this.cachedOrdersHash = ordersHash;
            this.orderSubscribers.forEach((callback) => {
              callback(aggregatedOrders);
            });
          }

          if (accountChanged) {
            this.cachedAccount = aggregatedAccount;
            this.cachedAccountHash = accountHash;
            this.accountSubscribers.forEach((callback) => {
              callback(aggregatedAccount);
            });
          }
        })
        .then((sub) => {
          this.webData2Subscriptions.set(dexName, sub);
          DevLogger.log(
            `webData2 subscription established for main DEX (HIP-3 DEXs use REST API polling)`,
          );
          resolve();
        })
        .catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('createWebData2Subscription', {
              dex: dexName,
            }),
          );
          reject(ensureError(error));
        });
    });
  }

  /**
   * Clean up all webData2 and clearinghouseState subscriptions when no longer needed (multi-DEX support)
   */
  private cleanupSharedWebData2Subscription(): void {
    const totalSubscribers =
      this.positionSubscriberCount +
      this.orderSubscriberCount +
      this.accountSubscriberCount;

    if (totalSubscribers <= 0) {
      // Cleanup webData2 subscriptions (main DEX)
      if (this.webData2Subscriptions.size > 0) {
        this.webData2Subscriptions.forEach((subscription, dexName) => {
          subscription.unsubscribe().catch((error: Error) => {
            Logger.error(
              ensureError(error),
              this.getErrorContext(
                'cleanupSharedWebData2Subscription.webData2',
                {
                  dex: dexName,
                },
              ),
            );
          });
        });
        this.webData2Subscriptions.clear();
        this.webData2SubscriptionPromise = undefined;
      }

      // HIP-3: Cleanup clearinghouseState subscriptions (HIP-3 DEXs)
      if (this.clearinghouseStateSubscriptions.size > 0) {
        const enabledDexs = this.getEnabledDexs();
        const hip3Dexs = enabledDexs.filter(
          (dex): dex is string => dex !== null,
        );
        hip3Dexs.forEach((dex) => {
          this.cleanupClearinghouseStateSubscription(dex);
        });
      }

      // Clear subscriber counts
      this.positionSubscriberCount = 0;
      this.orderSubscriberCount = 0;
      this.accountSubscriberCount = 0;

      // Clear per-DEX caches
      this.dexPositionsCache.clear();
      this.dexOrdersCache.clear();
      this.dexAccountCache.clear();

      // Clear aggregated caches
      this.cachedPositions = null;
      this.cachedOrders = null;
      this.cachedAccount = null;

      // Clear hash caches
      this.cachedPositionsHash = '';
      this.cachedOrdersHash = '';
      this.cachedAccountHash = '';

      DevLogger.log(
        'All multi-DEX subscriptions cleaned up (webData2 + clearinghouseState)',
      );
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToPositions'),
      );
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
        .then((userAddress) =>
          subscriptionClient.userFills(
            { user: userAddress },
            (data: WsUserFillsEvent) => {
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
                liquidation: fill.liquidation
                  ? {
                      liquidatedUser: fill.liquidation.liquidatedUser,
                      markPx: fill.liquidation.markPx,
                      method: fill.liquidation.method,
                    }
                  : undefined,
              }));

              callback(orderFills);
            },
          ),
        )
        .then((sub) => {
          // If cleanup was called before subscription completed, immediately unsubscribe
          if (cancelled) {
            sub.unsubscribe().catch((error: Error) => {
              Logger.error(
                ensureError(error),
                this.getErrorContext('subscribeToOrderFills.cleanup'),
              );
            });
          } else {
            subscription = sub;
          }
        })
        .catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('subscribeToOrderFills'),
          );
        });
    }

    return () => {
      cancelled = true;
      unsubscribe();

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('subscribeToOrderFills.unsubscribe'),
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOrders'),
      );
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
      Logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToAccount'),
      );
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
    if (marketData?.prevDayPx !== undefined) {
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
      .allMids((data: WsAllMidsEvent) => {
        wsMetrics.messagesReceived++;
        wsMetrics.lastMessageTime = Date.now();

        // Update cache for ALL available symbols
        Object.entries(data.mids).forEach(([symbol, price]) => {
          this.cachedPriceData ??= new Map<string, PriceUpdate>();

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
      })
      .catch((error) => {
        // Clear the promise on error so it can be retried
        this.globalAllMidsPromise = undefined;

        Logger.error(
          ensureError(error),
          this.getErrorContext('ensureGlobalAllMidsSubscription'),
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

    // Track metrics for this subscription
    const subscriptionMetrics = {
      messagesReceived: 0,
      startTime: Date.now(),
    };

    subscriptionClient
      .activeAssetCtx(
        { coin: symbol },
        (data: WsActiveAssetCtxEvent | WsActiveSpotAssetCtxEvent) => {
          subscriptionMetrics.messagesReceived++;

          if (data.coin === symbol && data.ctx) {
            // Type guard using SDK types: check if this is perps (has funding) or spot (no funding)
            const isPerpsContext = (
              event: WsActiveAssetCtxEvent | WsActiveSpotAssetCtxEvent,
            ): event is WsActiveAssetCtxEvent =>
              'funding' in event.ctx &&
              'openInterest' in event.ctx &&
              'oraclePx' in event.ctx;

            const ctx = data.ctx;

            // Cache market data for consolidation with price updates
            const ctxPrice = ctx.midPx || ctx.markPx;
            const marketData = {
              prevDayPx: ctx.prevDayPx
                ? parseFloat(ctx.prevDayPx.toString())
                : undefined,
              // Cache funding rate from activeAssetCtx for real-time updates
              // SDK defines funding as string (not nullable) in ActiveAssetCtxEvent
              funding: isPerpsContext(data)
                ? parseFloat(data.ctx.funding.toString())
                : undefined,
              // Convert openInterest from token units to USD by multiplying by current price
              // Note: openInterest from API is in token units (e.g., BTC), while volume is already in USD
              openInterest:
                isPerpsContext(data) && ctxPrice
                  ? parseFloat(data.ctx.openInterest.toString()) *
                    parseFloat(ctxPrice.toString())
                  : undefined,
              volume24h: ctx.dayNtlVlm
                ? parseFloat(ctx.dayNtlVlm.toString())
                : undefined,
              oraclePrice: isPerpsContext(data)
                ? parseFloat(data.ctx.oraclePx.toString())
                : undefined,
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

              this.cachedPriceData ??= new Map<string, PriceUpdate>();
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
        Logger.error(
          ensureError(error),
          this.getErrorContext('ensureActiveAssetSubscription', { symbol }),
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
   * Ensure assetCtxs subscription for specific DEX (HIP-3 support)
   * Uses WebSocket instead of REST polling for market data
   * Implements reference counting to track active subscribers per DEX
   */
  private async ensureAssetCtxsSubscription(dex: string): Promise<void> {
    const dexKey = dex || '';

    // Increment subscriber count for this DEX
    const currentCount = this.dexSubscriberCounts.get(dexKey) || 0;
    this.dexSubscriberCounts.set(dexKey, currentCount + 1);

    // Return if subscription already exists
    if (this.assetCtxsSubscriptions.has(dexKey)) {
      return;
    }

    // Return existing promise if subscription is being established
    if (this.assetCtxsSubscriptionPromises.has(dexKey)) {
      return this.assetCtxsSubscriptionPromises.get(dexKey);
    }

    // Create new subscription promise
    const promise = this.createAssetCtxsSubscription(dex);
    this.assetCtxsSubscriptionPromises.set(dexKey, promise);

    try {
      await promise;
    } catch (error) {
      // Clear promise on error so it can be retried
      this.assetCtxsSubscriptionPromises.delete(dexKey);
      throw error;
    }
  }

  /**
   * Create assetCtxs subscription for specific DEX
   * Provides real-time market data for all assets on the DEX
   *
   * Performance: Fetches meta() ONCE during setup to avoid REST API spam on every WebSocket update
   */
  private async createAssetCtxsSubscription(dex: string): Promise<void> {
    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const dexKey = dex || '';

    // Fetch meta ONCE during setup to cache symbol mapping
    // This prevents REST API call on every WebSocket update (critical performance fix)
    const infoClient = this.clientService.getInfoClient();
    const perpsMeta = await infoClient.meta({ dex: dex || undefined });

    const dexIdentifier = dex ?? 'main DEX';

    if (!perpsMeta?.universe) {
      const errorMessage = `No universe data available for ${dexIdentifier}`;
      throw new Error(errorMessage);
    }

    const metaLogMessage = `Cached meta for ${dexIdentifier}`;
    DevLogger.log(metaLogMessage, {
      dex,
      universeCount: perpsMeta.universe.length,
      firstAssetSample: perpsMeta.universe[0]?.name,
    });

    return new Promise<void>((resolve, reject) => {
      const subscriptionParams = dex ? { dex } : {};

      subscriptionClient
        .assetCtxs(subscriptionParams, (data: WsAssetCtxsEvent) => {
          // Cache asset contexts for this DEX
          this.dexAssetCtxsCache.set(dexKey, data.ctxs);

          const callbackLogMessage = `assetCtxs callback fired for ${dexIdentifier}`;
          DevLogger.log(callbackLogMessage, {
            dex,
            ctxsCount: data.ctxs?.length ?? 0,
          });

          // Use cached meta to map ctxs array indices to symbols (no REST API call!)
          perpsMeta.universe.forEach((asset, index) => {
            const ctx = data.ctxs[index];
            if (ctx && 'funding' in ctx) {
              // This is a perps context
              const ctxPrice = ctx.midPx || ctx.markPx;
              const marketData = {
                prevDayPx: ctx.prevDayPx
                  ? parseFloat(ctx.prevDayPx.toString())
                  : undefined,
                funding: parseFloat(ctx.funding.toString()),
                openInterest: ctxPrice
                  ? parseFloat(ctx.openInterest.toString()) *
                    parseFloat(ctxPrice.toString())
                  : undefined,
                volume24h: ctx.dayNtlVlm
                  ? parseFloat(ctx.dayNtlVlm.toString())
                  : undefined,
                oraclePrice: parseFloat(ctx.oraclePx.toString()),
                lastUpdated: Date.now(),
              };

              this.marketDataCache.set(asset.name, marketData);

              // HIP-3: Extract price from assetCtx and update cached prices
              const price = ctx.midPx?.toString() || ctx.markPx?.toString();
              if (price) {
                // For HIP-3 DEXs, meta() returns asset.name already containing the DEX prefix
                // (e.g., "xyz:XYZ100"), so use it directly
                const symbol = asset.name;
                const priceUpdate = this.createPriceUpdate(symbol, price);
                this.cachedPriceData ??= new Map<string, PriceUpdate>();
                this.cachedPriceData.set(symbol, priceUpdate);
              }
            }
          });

          // Notify price subscribers with updated market data
          DevLogger.log(`Notifying price subscribers after assetCtxs update`, {
            dex: dex || 'main',
            cachedPriceCount: this.cachedPriceData?.size ?? 0,
            subscriberCount: this.priceSubscribers.size,
          });
          this.notifyAllPriceSubscribers();
        })
        .then((sub) => {
          this.assetCtxsSubscriptions.set(dexKey, sub);
          DevLogger.log(
            `assetCtxs subscription established for ${
              dex ? `DEX: ${dex}` : 'main DEX'
            }`,
          );
          resolve();
        })
        .catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('createAssetCtxsSubscription', { dex }),
          );
          reject(ensureError(error));
        });
    });
  }

  /**
   * Cleanup assetCtxs subscription for specific DEX with reference counting
   * Only unsubscribes when the last subscriber for this DEX is removed
   */
  private cleanupAssetCtxsSubscription(dex: string): void {
    const dexKey = dex || '';

    // Decrement subscriber count for this DEX
    const currentCount = this.dexSubscriberCounts.get(dexKey) || 0;

    if (currentCount <= 1) {
      // Last subscriber - cleanup the subscription
      const subscription = this.assetCtxsSubscriptions.get(dexKey);

      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('cleanupAssetCtxsSubscription', { dex }),
          );
        });

        this.assetCtxsSubscriptions.delete(dexKey);
        this.dexAssetCtxsCache.delete(dexKey);
        this.assetCtxsSubscriptionPromises.delete(dexKey);
        this.dexSubscriberCounts.delete(dexKey);

        DevLogger.log(
          `Cleaned up assetCtxs subscription for ${
            dex ? `DEX: ${dex}` : 'main DEX'
          }`,
        );
      }
    } else {
      // Still has subscribers - just decrement count
      this.dexSubscriberCounts.set(dexKey, currentCount - 1);
    }
  }

  /**
   * Ensure clearinghouseState subscription for specific DEX (HIP-3 support)
   * Uses WebSocket instead of REST polling for account states
   */
  private async ensureClearinghouseStateSubscription(
    user: string,
    dex: string,
  ): Promise<void> {
    const dexKey = dex || '';

    // Return if subscription already exists
    if (this.clearinghouseStateSubscriptions.has(dexKey)) {
      return;
    }

    // Return existing promise if subscription is being established
    if (this.clearinghouseStateSubscriptionPromises.has(dexKey)) {
      return this.clearinghouseStateSubscriptionPromises.get(dexKey);
    }

    // Create new subscription promise
    const promise = this.createClearinghouseStateSubscription(user, dex);
    this.clearinghouseStateSubscriptionPromises.set(dexKey, promise);

    try {
      await promise;
    } catch (error) {
      // Clear promise on error so it can be retried
      this.clearinghouseStateSubscriptionPromises.delete(dexKey);
      throw error;
    }
  }

  /**
   * Create clearinghouseState subscription for specific DEX
   * Provides real-time account state, positions, and orders for the DEX
   */
  private async createClearinghouseStateSubscription(
    user: string,
    dex: string,
  ): Promise<void> {
    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const dexKey = dex || '';

    return new Promise<void>((resolve, reject) => {
      const subscriptionParams = dex ? { user, dex } : { user };

      subscriptionClient
        .clearinghouseState(
          subscriptionParams,
          async (data: WsClearinghouseStateEvent) => {
            DevLogger.log(
              `clearinghouseState callback fired for ${
                dex ? `DEX: ${dex}` : 'main DEX'
              }`,
              {
                dex,
                positionsCount: data.clearinghouseState.assetPositions.filter(
                  (assetPos: { position: { szi: string } }) =>
                    assetPos.position.szi !== '0',
                ).length,
              },
            );

            // Extract and process positions for this DEX
            const positions = data.clearinghouseState.assetPositions
              .filter(
                (assetPos: { position: { szi: string } }) =>
                  assetPos.position.szi !== '0',
              )
              .map((assetPos: Parameters<typeof adaptPositionFromSDK>[0]) =>
                adaptPositionFromSDK(assetPos),
              );

            // clearinghouseState WebSocket does NOT include openOrders field
            // Must fetch orders via REST API for HIP-3 DEXs
            let orders: Order[] = [];
            let positionsWithTPSL = positions;

            try {
              const infoClient = this.clientService.getInfoClient();
              const openOrdersData = await infoClient.frontendOpenOrders({
                user: data.user,
                dex: dex || undefined,
              });

              if (openOrdersData && Array.isArray(openOrdersData)) {
                // Extract TP/SL from orders and process orders using shared helper
                const { tpslMap, tpslCountMap, processedOrders } =
                  this.extractTPSLFromOrders(
                    openOrdersData as FrontendOpenOrdersResponse,
                    positions,
                  );

                orders = processedOrders;

                // Merge TP/SL data into positions using shared helper
                positionsWithTPSL = this.mergeTPSLIntoPositions(
                  positions,
                  tpslMap,
                  tpslCountMap,
                );

                DevLogger.log(
                  `clearinghouseState: Fetched and processed orders for ${
                    dex ? `DEX: ${dex}` : 'main DEX'
                  }`,
                  {
                    dex,
                    ordersCount: orders.length,
                    positionsWithTPSLCount: positionsWithTPSL.filter(
                      (p) => p.takeProfitPrice || p.stopLossPrice,
                    ).length,
                  },
                );
              }
            } catch (error) {
              // Log error but don't fail - fall back to positions without TP/SL
              Logger.error(
                ensureError(error),
                this.getErrorContext(
                  'createClearinghouseStateSubscription.fetchOrders',
                  {
                    dex,
                  },
                ),
              );
            }

            // Extract account state for this DEX
            const accountState = adaptAccountStateFromSDK(
              data.clearinghouseState,
              undefined, // No spot state in clearinghouseState event
            );

            // Store per-DEX data in caches (with TP/SL data merged!)
            this.dexPositionsCache.set(dexKey, positionsWithTPSL);
            this.dexOrdersCache.set(dexKey, orders);
            this.dexAccountCache.set(dexKey, accountState);

            // Aggregate data from all DEX caches
            const aggregatedPositions = Array.from(
              this.dexPositionsCache.values(),
            ).flat();
            const aggregatedOrders = Array.from(
              this.dexOrdersCache.values(),
            ).flat();
            const aggregatedAccount = this.aggregateAccountStates();

            // Check if aggregated data changed using fast hash comparison
            const positionsHash = this.hashPositions(aggregatedPositions);
            const ordersHash = this.hashOrders(aggregatedOrders);
            const accountHash = this.hashAccountState(aggregatedAccount);

            const positionsChanged = positionsHash !== this.cachedPositionsHash;
            const ordersChanged = ordersHash !== this.cachedOrdersHash;
            const accountChanged = accountHash !== this.cachedAccountHash;

            // Only notify subscribers if aggregated data changed
            if (positionsChanged) {
              this.cachedPositions = aggregatedPositions;
              this.cachedPositionsHash = positionsHash;
              this.positionSubscribers.forEach((callback) => {
                callback(aggregatedPositions);
              });
            }

            if (ordersChanged) {
              this.cachedOrders = aggregatedOrders;
              this.cachedOrdersHash = ordersHash;
              this.orderSubscribers.forEach((callback) => {
                callback(aggregatedOrders);
              });
            }

            if (accountChanged) {
              this.cachedAccount = aggregatedAccount;
              this.cachedAccountHash = accountHash;
              this.accountSubscribers.forEach((callback) => {
                callback(aggregatedAccount);
              });
            }
          },
        )
        .then((sub) => {
          this.clearinghouseStateSubscriptions.set(dexKey, sub);
          DevLogger.log(
            `clearinghouseState subscription established for ${
              dex ? `DEX: ${dex}` : 'main DEX'
            }`,
          );
          resolve();
        })
        .catch((error) => {
          Logger.error(
            ensureError(error),
            this.getErrorContext('createClearinghouseStateSubscription', {
              dex,
            }),
          );
          reject(ensureError(error));
        });
    });
  }

  /**
   * Cleanup clearinghouseState subscription for specific DEX
   */
  private cleanupClearinghouseStateSubscription(dex: string): void {
    const dexKey = dex || '';
    const subscription = this.clearinghouseStateSubscriptions.get(dexKey);

    if (subscription) {
      subscription.unsubscribe().catch((error: Error) => {
        Logger.error(
          ensureError(error),
          this.getErrorContext('cleanupClearinghouseStateSubscription', {
            dex,
          }),
        );
      });

      this.clearinghouseStateSubscriptions.delete(dexKey);
      this.clearinghouseStateSubscriptionPromises.delete(dexKey);

      DevLogger.log(
        `Cleaned up clearinghouseState subscription for ${
          dex ? `DEX: ${dex}` : 'main DEX'
        }`,
      );
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
      .l2Book({ coin: symbol, nSigFigs: 5 }, (data: L2BookResponse) => {
        processL2BookData({
          symbol,
          data,
          orderBookCache: this.orderBookCache,
          cachedPriceData: this.cachedPriceData,
          createPriceUpdate: this.createPriceUpdate.bind(this),
          notifySubscribers: this.notifyAllPriceSubscribers.bind(this),
        });
      })
      .then((sub) => {
        this.globalL2BookSubscriptions.set(symbol, sub);
        DevLogger.log(
          `HyperLiquid: L2 book subscription established for ${symbol}`,
        );
      })
      .catch((error) => {
        Logger.error(
          ensureError(error),
          this.getErrorContext('ensureL2BookSubscription', { symbol }),
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
   * Clear all subscriptions and cached data (multi-DEX support)
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
    this.dexSubscriberCounts.clear();

    // Clear hash caches
    this.cachedPositionsHash = '';
    this.cachedOrdersHash = '';
    this.cachedAccountHash = '';

    // Clear multi-DEX caches
    this.dexPositionsCache.clear();
    this.dexOrdersCache.clear();
    this.dexAccountCache.clear();
    this.dexAssetCtxsCache.clear();

    // Clear subscription references (actual cleanup handled by client service)
    this.globalAllMidsSubscription = undefined;
    this.globalActiveAssetSubscriptions.clear();
    this.globalL2BookSubscriptions.clear();
    this.webData2Subscriptions.clear();
    this.webData2SubscriptionPromise = undefined;

    // HIP-3: Clear new subscription types
    this.assetCtxsSubscriptions.clear();
    this.assetCtxsSubscriptionPromises.clear();
    this.clearinghouseStateSubscriptions.clear();
    this.clearinghouseStateSubscriptionPromises.clear();

    DevLogger.log(
      'HyperLiquid: Subscription service cleared (multi-DEX + HIP-3)',
      {
        timestamp: new Date().toISOString(),
      },
    );
  }
}
