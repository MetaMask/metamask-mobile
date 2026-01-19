import {
  type ISubscription,
  type AllMidsWsEvent,
  type WebData2WsEvent,
  type WebData3WsEvent,
  type UserFillsWsEvent,
  type ActiveAssetCtxWsEvent,
  type ActiveSpotAssetCtxWsEvent,
  type L2BookResponse,
  type AssetCtxsWsEvent,
  type FrontendOpenOrdersResponse,
  type ClearinghouseStateWsEvent,
  type OpenOrdersWsEvent,
} from '@nktkas/hyperliquid';
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
  SubscribeOICapsParams,
  SubscribeOrderBookParams,
  OrderBookData,
  OrderBookLevel,
  IPerpsPlatformDependencies,
} from '../controllers/types';
import {
  adaptPositionFromSDK,
  adaptOrderFromSDK,
  adaptAccountStateFromSDK,
  parseAssetName,
} from '../utils/hyperLiquidAdapter';
import { calculateWeightedReturnOnEquity } from '../utils/accountUtils';
import type { HyperLiquidClientService } from './HyperLiquidClientService';
import type { HyperLiquidWalletService } from './HyperLiquidWalletService';
import type { CaipAccountId } from '@metamask/utils';
import { TP_SL_CONFIG, PERPS_CONSTANTS } from '../constants/perpsConfig';
import { ensureError } from '../../../../util/errorUtils';
import { processL2BookData } from '../utils/hyperLiquidOrderBookProcessor';
import { calculateOpenInterestUSD } from '../utils/marketDataTransform';

/**
 * Service for managing HyperLiquid WebSocket subscriptions
 * Implements singleton subscription architecture with reference counting
 */
export class HyperLiquidSubscriptionService {
  // Service dependencies
  private readonly clientService: HyperLiquidClientService;
  private readonly walletService: HyperLiquidWalletService;

  // HIP-3 feature flag support
  private hip3Enabled: boolean;
  private enabledDexs: string[]; // DEX identification (maps webData3 indices to DEX names)
  private allowlistMarkets: string[]; // Market filtering (allowlist)
  private blocklistMarkets: string[]; // Market filtering (blocklist)
  private discoveredDexNames: string[] = []; // DEX order for mapping webData3 perpDexStates indices

  // DEX discovery synchronization - allows subscriptions to wait for HIP-3 DEX discovery
  private dexDiscoveryPromise: Promise<void> | null = null;
  private dexDiscoveryResolver: (() => void) | null = null;

  // Track DEXs for synchronized position notifications
  // Ensures all DEXs send initial data before notifying subscribers
  private expectedDexs: Set<string> = new Set();
  private initializedDexs: Set<string> = new Set();

  // Subscriber collections
  private readonly priceSubscribers = new Map<
    string,
    Set<(prices: PriceUpdate[]) => void>
  >();
  private readonly positionSubscribers = new Set<
    (positions: Position[]) => void
  >();
  // Order fill subscribers keyed by accountId (normalized: undefined -> 'default')
  private readonly orderFillSubscribers = new Map<
    string,
    Set<(fills: OrderFill[], isSnapshot?: boolean) => void>
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

  // Track which subscribers want L2Book (order book) data
  private readonly orderBookSubscribers = new Map<
    string,
    Set<(prices: PriceUpdate[]) => void>
  >();

  // Global singleton subscriptions
  private globalAllMidsSubscription?: ISubscription;
  private globalAllMidsPromise?: Promise<void>; // Track in-progress subscription
  private readonly globalActiveAssetSubscriptions = new Map<
    string,
    ISubscription
  >();
  private readonly globalL2BookSubscriptions = new Map<string, ISubscription>();
  // Order fill subscriptions keyed by accountId (normalized: undefined -> 'default')
  private readonly orderFillSubscriptions = new Map<string, ISubscription>();
  private readonly symbolSubscriberCounts = new Map<string, number>();
  private readonly dexSubscriberCounts = new Map<string, number>(); // Track subscribers per DEX for assetCtxs

  // Multi-DEX webData3 subscription for all user data (positions, orders, account, OI caps)
  private readonly webData3Subscriptions = new Map<string, ISubscription>(); // Key: dex name ('' for main)
  private webData3SubscriptionPromise?: Promise<void>;
  private positionSubscriberCount = 0;
  private orderSubscriberCount = 0;
  private accountSubscriberCount = 0;
  private oiCapSubscriberCount = 0;

  // Multi-DEX data caches
  private readonly dexPositionsCache = new Map<string, Position[]>(); // Per-DEX positions
  private readonly dexOrdersCache = new Map<string, Order[]>(); // Per-DEX orders
  private readonly dexAccountCache = new Map<string, AccountState>(); // Per-DEX account state
  private cachedPositions: Position[] | null = null; // Aggregated positions
  private cachedOrders: Order[] | null = null; // Aggregated orders
  private cachedAccount: AccountState | null = null; // Aggregated account
  private ordersCacheInitialized = false; // Track if orders cache has received WebSocket data
  private positionsCacheInitialized = false; // Track if positions cache has received WebSocket data

  // OI Cap tracking (from webData3.perpDexStates[].perpsAtOpenInterestCap)
  private readonly oiCapSubscribers = new Set<(caps: string[]) => void>();
  private cachedOICaps: string[] = [];
  private cachedOICapsHash = '';
  private oiCapsCacheInitialized = false;

  // Global price data cache
  private cachedPriceData: Map<string, PriceUpdate> | null = null;

  // HIP-3: assetCtxs subscriptions for multi-DEX market data
  private readonly assetCtxsSubscriptions = new Map<string, ISubscription>(); // Key: dex name ('' for main)
  private readonly dexAssetCtxsCache = new Map<
    string,
    AssetCtxsWsEvent['ctxs']
  >(); // Per-DEX asset contexts
  private assetCtxsSubscriptionPromises = new Map<string, Promise<void>>(); // Track in-progress subscriptions

  private readonly clearinghouseStateSubscriptions = new Map<
    string,
    ISubscription
  >(); // Key: dex name ('' for main)
  private readonly openOrdersSubscriptions = new Map<string, ISubscription>(); // Key: dex name ('' for main)

  // Meta cache per DEX - populated by metaAndAssetCtxs, used by createAssetCtxsSubscription
  // This avoids redundant meta() API calls since metaAndAssetCtxs already returns meta data
  private readonly dexMetaCache = new Map<
    string,
    {
      universe: {
        name: string;
        szDecimals: number;
        maxLeverage: number;
      }[];
    }
  >();

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

  // Platform dependencies for logging
  private readonly deps: IPerpsPlatformDependencies;

  constructor(
    clientService: HyperLiquidClientService,
    walletService: HyperLiquidWalletService,
    platformDependencies: IPerpsPlatformDependencies,
    hip3Enabled?: boolean,
    enabledDexs?: string[],
    allowlistMarkets?: string[],
    blocklistMarkets?: string[],
  ) {
    this.clientService = clientService;
    this.walletService = walletService;
    this.deps = platformDependencies;
    this.hip3Enabled = hip3Enabled ?? false;
    this.enabledDexs = enabledDexs ?? [];
    this.discoveredDexNames = enabledDexs ?? [];
    this.allowlistMarkets = allowlistMarkets ?? [];
    this.blocklistMarkets = blocklistMarkets ?? [];
  }

  /**
   * Get error context for logging with searchable tags and context.
   * Enables Sentry dashboard filtering by feature, provider, and network.
   *
   * @param method - The method name where the error occurred
   * @param extra - Optional additional context fields (merged into searchable context.data)
   * @returns Error options with tags (searchable) and context (searchable)
   * @private
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
        provider: 'hyperliquid',
        network: this.clientService.isTestnetMode() ? 'testnet' : 'mainnet',
      },
      context: {
        name: 'HyperLiquidSubscriptionService',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  /**
   * Check if a DEX is enabled in our configuration
   * Used to filter webData3 callback data to only process DEXs we care about
   * @param dex - DEX name (null for main DEX, string for HIP-3)
   * @returns true if this DEX should be processed
   */
  private isDexEnabled(dex: string | null): boolean {
    if (dex === null) {
      return true; // Main DEX always enabled
    }
    if (!this.hip3Enabled) {
      return false; // HIP-3 disabled entirely
    }
    return this.enabledDexs.includes(dex);
  }

  /**
   * Populate DEX meta cache with pre-fetched meta data
   * Called by Provider after buildAssetMapping to share cached meta,
   * avoiding redundant metaAndAssetCtxs/meta API calls during subscription setup
   * @param dex - DEX key ('' for main DEX, 'xyz'/'flx'/etc for HIP-3)
   * @param meta - Meta response containing universe data
   */
  public setDexMetaCache(
    dex: string,
    meta: {
      universe: {
        name: string;
        szDecimals: number;
        maxLeverage: number;
      }[];
    },
  ): void {
    this.dexMetaCache.set(dex, meta);
    this.deps.debugLogger.log(
      '[SubscriptionService] DEX meta cache populated',
      {
        dex: dex || 'main',
        universeSize: meta.universe.length,
      },
    );
  }

  /**
   * Cache asset contexts for a specific DEX from API response
   * This allows buildAssetMapping() to populate cache for getMarketDataWithPrices() to use
   * @param dex - DEX name ('' for main perps)
   * @param assetCtxs - Asset contexts from metaAndAssetCtxs response
   */
  public setDexAssetCtxsCache(
    dex: string,
    assetCtxs: AssetCtxsWsEvent['ctxs'],
  ): void {
    this.dexAssetCtxsCache.set(dex, assetCtxs);
    this.deps.debugLogger.log(
      '[SubscriptionService] DEX assetCtxs cache populated',
      {
        dex: dex || 'main',
        ctxsCount: assetCtxs.length,
      },
    );
  }

  /**
   * Get cached assetCtxs for a DEX
   * Returns the cached asset contexts from WebSocket subscription if available
   * @param dex - DEX key ('' for main DEX, 'xyz'/'flx'/etc for HIP-3)
   * @returns Array of asset contexts or undefined if not cached
   */
  public getDexAssetCtxsCache(
    dex: string,
  ): AssetCtxsWsEvent['ctxs'] | undefined {
    return this.dexAssetCtxsCache.get(dex);
  }

  /**
   * Wait for DEX discovery to complete (with timeout)
   * Used when HIP-3 is enabled but enabledDexs hasn't been populated yet.
   * This allows subscriptions to wait for DEX discovery before creating per-DEX subscriptions.
   */
  private async waitForDexDiscovery(timeoutMs: number = 5000): Promise<void> {
    // Already have DEXs, no need to wait
    if (this.enabledDexs.length > 0) {
      return;
    }

    // Create promise if not exists
    if (!this.dexDiscoveryPromise) {
      this.dexDiscoveryPromise = new Promise<void>((resolve) => {
        this.dexDiscoveryResolver = resolve;
      });
    }

    // Wait with timeout
    let timeoutId: NodeJS.Timeout | undefined;
    const timeoutPromise = new Promise<void>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('DEX discovery timeout')),
        timeoutMs,
      );
    });

    try {
      await Promise.race([this.dexDiscoveryPromise, timeoutPromise]);
    } catch {
      this.deps.debugLogger.log(
        'DEX discovery wait timed out, proceeding with main DEX only',
      );
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }
  }

  /**
   * Update feature flags for HIP-3 support
   * Called when provider configuration changes at runtime
   * Note: Market filtering is NOT applied in subscription service - only in Provider
   */
  public async updateFeatureFlags(
    hip3Enabled: boolean,
    enabledDexs: string[],
    allowlistMarkets: string[],
    blocklistMarkets: string[],
  ): Promise<void> {
    const previousEnabledDexs = [...this.enabledDexs];
    const previousAllowlistMarkets = [...this.allowlistMarkets];
    const previousBlocklistMarkets = [...this.blocklistMarkets];
    const previousHip3Enabled = this.hip3Enabled;

    this.hip3Enabled = hip3Enabled;
    this.enabledDexs = enabledDexs;
    this.allowlistMarkets = allowlistMarkets;
    this.blocklistMarkets = blocklistMarkets;
    this.discoveredDexNames = enabledDexs; // Store DEX order for webData3 index mapping

    // Resolve any pending DEX discovery wait now that DEXs are available
    if (this.dexDiscoveryResolver && enabledDexs.length > 0) {
      this.dexDiscoveryResolver();
      this.dexDiscoveryPromise = null;
      this.dexDiscoveryResolver = null;
    }

    this.deps.debugLogger.log('Feature flags updated:', {
      previousHip3Enabled,
      hip3Enabled,
      previousEnabledDexs,
      enabledDexs,
      previousAllowlistMarkets,
      allowlistMarkets,
      previousBlocklistMarkets,
      blocklistMarkets,
    });

    // If equity was just enabled or new DEXs were added
    const newDexs = enabledDexs.filter(
      (dex) => !previousEnabledDexs.includes(dex),
    );
    if (
      (!previousHip3Enabled && hip3Enabled && enabledDexs.length > 0) ||
      newDexs.length > 0
    ) {
      this.deps.debugLogger.log(
        'Establishing subscriptions for new DEXs:',
        newDexs,
      );

      // Establish assetCtxs subscriptions for new DEXs (for market data)
      const hasMarketDataSubscribers = this.marketDataSubscribers.size > 0;
      if (hasMarketDataSubscribers) {
        await Promise.all(
          newDexs.map(async (dex) => {
            try {
              await this.ensureAssetCtxsSubscription(dex);
            } catch (error) {
              this.deps.logger.error(
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

      // Establish clearinghouseState/openOrders subscriptions for new DEXs
      // (needed for positions, orders, and account data when using individual subscriptions)
      const hasUserDataSubscribers =
        this.positionSubscriberCount > 0 ||
        this.orderSubscriberCount > 0 ||
        this.accountSubscriberCount > 0;

      if (hasUserDataSubscribers && this.hip3Enabled) {
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
                await this.ensureOpenOrdersSubscription(userAddress, dex);
                this.deps.debugLogger.log(
                  `Established user data subscriptions for new DEX: ${dex}`,
                );
              } catch (error) {
                this.deps.logger.error(
                  ensureError(error),
                  this.getErrorContext(
                    'updateFeatureFlags.ensureUserDataSubscription',
                    { dex },
                  ),
                );
              }
            }),
          );
        } catch (error) {
          this.deps.logger.error(
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
   * Tracks structural changes (coin, size, entryPrice, leverage, TP/SL prices/counts)
   * and value changes (unrealizedPnl, returnOnEquity) for live P&L updates
   */
  private hashPositions(positions: Position[]): string {
    if (!positions || positions.length === 0) return '0';
    return positions
      .map(
        (p) =>
          `${p.coin}:${p.size}:${p.entryPrice}:${p.leverage.value}:${
            p.takeProfitPrice || ''
          }:${p.stopLossPrice || ''}:${p.takeProfitCount}:${p.stopLossCount}:${
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

  // Cache hashes to avoid recomputation
  private cachedPositionsHash = '';
  private cachedOrdersHash = '';
  private cachedAccountHash = '';

  /**
   * Extract TP/SL from orders and optionally convert raw SDK orders to Order format.
   * DRY helper used by both webData2 and clearinghouseState callbacks.
   *
   * @param orders - Raw SDK orders from WebSocket event
   * @param positions - Current positions for TP/SL matching
   * @param cachedProcessedOrders - Optional pre-processed orders (skips conversion if provided)
   * @returns Maps for TP/SL prices and counts, plus processed Order array
   */
  private extractTPSLFromOrders(
    orders: FrontendOpenOrdersResponse,
    positions: Position[],
    cachedProcessedOrders?: Order[],
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

    // If cached processed orders provided, extract TP/SL from them directly
    if (cachedProcessedOrders) {
      cachedProcessedOrders.forEach((order) => {
        // Use triggerPrice for TP/SL (trigger condition price), falling back to price
        // This ensures consistency with raw SDK order processing which uses triggerPx
        const tpslPrice = order.triggerPrice || order.price;
        if (order.isTrigger && tpslPrice) {
          const isTakeProfit = order.detailedOrderType?.includes('Take Profit');
          const isStop = order.detailedOrderType?.includes('Stop');

          const matchingPosition = positions.find(
            (p) => p.coin === order.symbol,
          );

          // Determine TP vs SL classification for count and price updates
          // Use order type first, fallback to price-based detection for ambiguous 'Trigger' types
          let classifiedAsTakeProfit = isTakeProfit;
          let classifiedAsStop = isStop;

          if (!isTakeProfit && !isStop && matchingPosition) {
            // Fallback: determine based on trigger price vs entry price
            // This handles orders with ambiguous type 'Trigger'
            const triggerPrice = parseFloat(tpslPrice);
            const entryPrice = parseFloat(matchingPosition.entryPrice || '0');
            const isLong = parseFloat(matchingPosition.size) > 0;

            if (isLong) {
              if (triggerPrice > entryPrice) {
                classifiedAsTakeProfit = true;
              } else {
                classifiedAsStop = true;
              }
            } else if (triggerPrice < entryPrice) {
              classifiedAsTakeProfit = true;
            } else {
              classifiedAsStop = true;
            }
          }

          const currentTakeProfitCount =
            tpslCountMap.get(order.symbol)?.takeProfitCount || 0;
          const currentStopLossCount =
            tpslCountMap.get(order.symbol)?.stopLossCount || 0;

          tpslCountMap.set(order.symbol, {
            takeProfitCount: classifiedAsTakeProfit
              ? currentTakeProfitCount + 1
              : currentTakeProfitCount,
            stopLossCount: classifiedAsStop
              ? currentStopLossCount + 1
              : currentStopLossCount,
          });

          if (matchingPosition) {
            const existing = tpslMap.get(order.symbol) || {};
            if (classifiedAsTakeProfit) {
              existing.takeProfitPrice = tpslPrice;
            } else if (classifiedAsStop) {
              existing.stopLossPrice = tpslPrice;
            }
            tpslMap.set(order.symbol, existing);
          }
        }
      });

      return { tpslMap, tpslCountMap, processedOrders: cachedProcessedOrders };
    }

    // Process raw SDK orders
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

        const coin = order.coin;
        position = positions.find(matchPositionToTpsl);
        positionForCoin = positions.find(matchPositionToCoin);

        // Determine TP vs SL classification for count and price updates
        // Use order type first, fallback to price-based detection for ambiguous 'Trigger' types
        // This matches the cached order processing logic for consistency
        let classifiedAsTakeProfit = isTakeProfit;
        let classifiedAsStop = isStop;

        if (!isTakeProfit && !isStop && position) {
          // Fallback: determine based on trigger price vs entry price
          // This handles orders with ambiguous type 'Trigger'
          const triggerPrice = parseFloat(order.triggerPx);
          const entryPrice = parseFloat(position.entryPrice || '0');
          const isLong = parseFloat(position.size) > 0;

          if (isLong) {
            if (triggerPrice > entryPrice) {
              classifiedAsTakeProfit = true;
            } else {
              classifiedAsStop = true;
            }
          } else if (triggerPrice < entryPrice) {
            classifiedAsTakeProfit = true;
          } else {
            classifiedAsStop = true;
          }
        }

        const currentTakeProfitCount =
          tpslCountMap.get(coin)?.takeProfitCount || 0;
        const currentStopLossCount = tpslCountMap.get(coin)?.stopLossCount || 0;

        tpslCountMap.set(coin, {
          takeProfitCount: classifiedAsTakeProfit
            ? currentTakeProfitCount + 1
            : currentTakeProfitCount,
          stopLossCount: classifiedAsStop
            ? currentStopLossCount + 1
            : currentStopLossCount,
        });

        if (position) {
          const existing = tpslMap.get(coin) || {};

          // Use classified values for price assignment (consistent with count logic)
          if (classifiedAsTakeProfit) {
            existing.takeProfitPrice = order.triggerPx;
          } else if (classifiedAsStop) {
            existing.stopLossPrice = order.triggerPx;
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
   * Aggregate account states from all cached DEXs
   * Sums balances and creates per-DEX breakdown for multi-DEX portfolio view
   * @returns Aggregated account state with dexBreakdown field
   * @private
   */
  private aggregateAccountStates(): AccountState {
    const subAccountBreakdown: Record<
      string,
      { availableBalance: string; totalBalance: string }
    > = {};
    let totalAvailableBalance = 0;
    let totalBalance = 0;
    let totalMarginUsed = 0;
    let totalUnrealizedPnl = 0;

    // Collect account states for weighted ROE calculation
    const accountStatesForROE: {
      unrealizedPnl: string;
      returnOnEquity: string;
    }[] = [];

    // Aggregate all cached account states
    Array.from(this.dexAccountCache.entries()).forEach(
      ([currentDex, state]) => {
        const dexKey = currentDex === '' ? 'main' : currentDex;
        subAccountBreakdown[dexKey] = {
          availableBalance: state.availableBalance,
          totalBalance: state.totalBalance,
        };
        totalAvailableBalance += parseFloat(state.availableBalance);
        totalBalance += parseFloat(state.totalBalance);
        totalMarginUsed += parseFloat(state.marginUsed);
        totalUnrealizedPnl += parseFloat(state.unrealizedPnl);

        // Collect data for weighted ROE calculation
        accountStatesForROE.push({
          unrealizedPnl: state.unrealizedPnl,
          returnOnEquity: state.returnOnEquity,
        });
      },
    );

    // Use first DEX's account state as base and override aggregated values
    const firstDexAccount =
      this.dexAccountCache.values().next().value || ({} as AccountState);

    // Calculate weighted returnOnEquity across all DEXs
    const returnOnEquity = calculateWeightedReturnOnEquity(accountStatesForROE);

    return {
      ...firstDexAccount,
      availableBalance: totalAvailableBalance.toString(),
      totalBalance: totalBalance.toString(),
      marginUsed: totalMarginUsed.toString(),
      unrealizedPnl: totalUnrealizedPnl.toString(),
      subAccountBreakdown,
      returnOnEquity,
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
      // Track order book subscribers separately
      if (includeOrderBook) {
        unsubscribers.push(
          this.createSubscription(this.orderBookSubscribers, callback, symbol),
        );
      }
    });

    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      this.deps.debugLogger.log(
        'SubscriptionClient not available for price subscription',
      );
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
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext(
              'subscribeToPrices.ensureAssetCtxsSubscription',
              { dex: dexName },
            ),
          );
        });
      });
    }

    // Note: Funding rates are now cached via assetCtxs WebSocket subscription
    // (ensureAssetCtxsSubscription above), eliminating the need for a separate
    // metaAndAssetCtxs API call here. The WebSocket callback in createAssetCtxsSubscription
    // populates marketDataCache with funding rates as they arrive.

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
   * Ensure shared webData3 subscription is active (singleton pattern with multi-DEX support)
   * webData3 provides data for all DEXs (main + HIP-3) in a single subscription
   */
  private async ensureSharedWebData3Subscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    // Establish webData3 subscription (if not exists)
    if (!this.webData3Subscriptions.has('')) {
      if (!this.webData3SubscriptionPromise) {
        this.webData3SubscriptionPromise =
          this.createUserDataSubscription(accountId);

        try {
          await this.webData3SubscriptionPromise;
        } catch (error) {
          this.webData3SubscriptionPromise = undefined;
          throw error;
        }
      } else {
        await this.webData3SubscriptionPromise;
      }
    }
    // Note: webData3 includes all DEX data, so no separate HIP-3 subscriptions needed
  }

  /**
   * Create WebSocket subscription for user data (positions, orders, account)
   * - Uses webData2 when HIP-3 disabled (main DEX only)
   * - Uses webData3 when HIP-3 enabled (main + HIP-3 DEXs)
   *
   * webData2 provides data for main DEX only
   * webData3 provides perpDexStates[] array containing data for all DEXs:
   * - Index 0: Main DEX (dexName = '')
   * - Index 1+: HIP-3 DEXs in order of enabledDexs array
   */
  private async createUserDataSubscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );
    const subscriptionClient = this.clientService.getSubscriptionClient();

    if (!subscriptionClient) {
      throw new Error('Subscription client not initialized');
    }

    const userAddress =
      await this.walletService.getUserAddressWithDefault(accountId);

    const dexName = ''; // Use empty string as key for single subscription

    // Skip if subscription already exists
    if (this.webData3Subscriptions.has(dexName)) {
      return;
    }

    // Wait for DEX discovery if HIP-3 is enabled but DEXs haven't been discovered yet
    // This ensures HIP-3 subscriptions are created together with main DEX
    if (this.hip3Enabled && this.enabledDexs.length === 0) {
      this.deps.debugLogger.log(
        'Waiting for DEX discovery before creating subscriptions...',
      );
      await this.waitForDexDiscovery();
      this.deps.debugLogger.log(
        'DEX discovery complete, proceeding with subscriptions',
        {
          enabledDexs: this.enabledDexs,
        },
      );
    }

    return new Promise<void>((resolve, reject) => {
      // Choose channel based on HIP-3 master switch
      if (!this.hip3Enabled) {
        // HIP-3 disabled: Use webData2 (main DEX only)
        subscriptionClient
          .webData2({ user: userAddress }, (data: WebData2WsEvent) => {
            try {
              // webData2 returns clearinghouseState for main DEX only
              const currentDexName = ''; // Main DEX

              // Check for removed fields before accessing
              if (!data.clearinghouseState) {
                return;
              }

              // Extract and process positions from clearinghouseState
              const positions = data.clearinghouseState.assetPositions
                .filter((assetPos) => assetPos.position.szi !== '0')
                .map((assetPos) => adaptPositionFromSDK(assetPos));

              // Extract TP/SL from orders
              const {
                tpslMap,
                tpslCountMap,
                processedOrders: orders,
              } = this.extractTPSLFromOrders(data.openOrders || [], positions);

              // Merge TP/SL data into positions
              const positionsWithTPSL = this.mergeTPSLIntoPositions(
                positions,
                tpslMap,
                tpslCountMap,
              );

              // Extract account data (webData2 provides clearinghouseState)
              const accountState: AccountState = adaptAccountStateFromSDK(
                data.clearinghouseState,
                undefined, // webData2 doesn't include spotState
              );

              // Store in caches (main DEX only)
              this.dexPositionsCache.set(currentDexName, positionsWithTPSL);
              this.dexOrdersCache.set(currentDexName, orders);
              this.dexAccountCache.set(currentDexName, accountState);

              // OI caps (main DEX only)
              const oiCaps = data.perpsAtOpenInterestCap || [];
              const oiCapsHash = [...oiCaps]
                .sort((a: string, b: string) => a.localeCompare(b))
                .join(',');
              if (oiCapsHash !== this.cachedOICapsHash) {
                this.cachedOICaps = oiCaps;
                this.cachedOICapsHash = oiCapsHash;
                this.oiCapsCacheInitialized = true;
                this.oiCapSubscribers.forEach((callback) => callback(oiCaps));
              }

              // Notify subscribers (no aggregation needed - only main DEX)
              const positionsHash = this.hashPositions(positionsWithTPSL);
              const ordersHash = this.hashOrders(orders);
              const accountHash = this.hashAccountState(accountState);

              if (positionsHash !== this.cachedPositionsHash) {
                this.cachedPositions = positionsWithTPSL;
                this.cachedPositionsHash = positionsHash;
                this.positionsCacheInitialized = true;
                this.positionSubscribers.forEach((callback) =>
                  callback(positionsWithTPSL),
                );
              }

              if (ordersHash !== this.cachedOrdersHash) {
                this.cachedOrders = orders;
                this.cachedOrdersHash = ordersHash;
                this.ordersCacheInitialized = true;
                this.orderSubscribers.forEach((callback) => callback(orders));
              }

              if (accountHash !== this.cachedAccountHash) {
                this.cachedAccount = accountState;
                this.cachedAccountHash = accountHash;
                this.accountSubscribers.forEach((callback) =>
                  callback(accountState),
                );
              }
            } catch (error) {
              this.deps.logger.error(
                ensureError(error),
                this.getErrorContext('webData2 callback error', {
                  user: userAddress,
                  dataKeys: data ? Object.keys(data) : 'data is null/undefined',
                  hasClearinghouseState: data?.clearinghouseState !== undefined,
                  hasOpenOrders: data?.openOrders !== undefined,
                  hasPerpsAtOpenInterestCap:
                    data?.perpsAtOpenInterestCap !== undefined,
                }),
              );
            }
          })
          .then((subscription) => {
            this.webData3Subscriptions.set(dexName, subscription);
            this.deps.debugLogger.log(
              'webData2 subscription established for main DEX only',
            );
            resolve();
          })
          .catch((error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext('createUserDataSubscription (webData2)', {
                dex: dexName,
              }),
            );
            reject(ensureError(error));
          });
      } else {
        // HIP-3 enabled: Use individual subscriptions for positions/orders/account
        // webData3 is only used for OI caps extraction

        // Determine which DEXs to subscribe to
        const dexsToSubscribe = [
          '', // Main DEX
          ...this.enabledDexs.filter((d) => this.isDexEnabled(d)),
        ];

        // Track expected DEXs for synchronized notifications
        // Clear previous tracking and set new expected DEXs
        this.expectedDexs = new Set(dexsToSubscribe);
        this.initializedDexs = new Set();

        // Set up individual subscriptions for each DEX
        const subscriptionPromises: Promise<void>[] = [];

        for (const currentDexName of dexsToSubscribe) {
          // Set up clearinghouseState subscription for positions + account
          subscriptionPromises.push(
            this.ensureClearinghouseStateSubscription(
              userAddress,
              currentDexName,
            ),
          );

          // Set up openOrders subscription for orders
          subscriptionPromises.push(
            this.ensureOpenOrdersSubscription(userAddress, currentDexName),
          );
        }

        // Also set up webData3 for OI caps only
        const webData3Promise = subscriptionClient
          .webData3({ user: userAddress }, (data: WebData3WsEvent) => {
            try {
              // webData3 is ONLY used for OI caps extraction
              // Positions, orders, and account data come from individual subscriptions
              const allOICaps: string[] = [];
              data.perpDexStates.forEach((dexState, index) => {
                // Map webData3 index to DEX name
                // Index 0 = main DEX (null), Index 1+ = HIP-3 DEXs from discoveredDexNames
                const dexIdentifier =
                  index === 0 ? null : this.discoveredDexNames[index - 1];

                // Skip unknown DEXs (not in discoveredDexNames) to prevent main DEX cache corruption
                if (index > 0 && dexIdentifier === undefined) {
                  return; // Unknown DEX - skip to prevent misidentifying as main DEX
                }

                // Only process DEXs we care about (skip others silently)
                if (!this.isDexEnabled(dexIdentifier ?? null)) {
                  return; // Skip this DEX - not enabled in our configuration
                }

                const currentDexName = dexIdentifier ?? '';

                const oiCaps = dexState.perpsAtOpenInterestCap || [];

                // Add DEX prefix for HIP-3 symbols (e.g., "xyz:TSLA")
                if (currentDexName) {
                  allOICaps.push(
                    ...oiCaps.map((symbol) => `${currentDexName}:${symbol}`),
                  );
                } else {
                  // Main DEX - no prefix needed
                  allOICaps.push(...oiCaps);
                }
              });

              // Update OI caps cache and notify if changed
              const oiCapsHash = [...allOICaps]
                .sort((a: string, b: string) => a.localeCompare(b))
                .join(',');
              if (oiCapsHash !== this.cachedOICapsHash) {
                this.cachedOICaps = allOICaps;
                this.cachedOICapsHash = oiCapsHash;
                this.oiCapsCacheInitialized = true;

                // Notify all subscribers
                this.oiCapSubscribers.forEach((callback) =>
                  callback(allOICaps),
                );
              }
            } catch (error) {
              this.deps.logger.error(
                ensureError(error),
                this.getErrorContext('webData3 callback error', {
                  user: userAddress,
                  hasPerpDexStates: data?.perpDexStates !== undefined,
                  perpDexStatesLength: data?.perpDexStates?.length ?? 0,
                }),
              );
            }
          })
          .then((sub) => {
            this.webData3Subscriptions.set(dexName, sub);
            this.deps.debugLogger.log(
              `webData3 subscription established for OI caps (main + HIP-3)`,
            );
          })
          .catch((error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext('createUserDataSubscription (webData3)', {
                dex: dexName,
              }),
            );
            throw error;
          });

        subscriptionPromises.push(webData3Promise);

        // Wait for all subscriptions to be established
        Promise.all(subscriptionPromises)
          .then(() => {
            this.deps.debugLogger.log(
              `HIP-3 user data subscriptions established for ${dexsToSubscribe.length} DEXs`,
            );
            resolve();
          })
          .catch((error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext('createUserDataSubscription (HIP-3)', {
                dexs: dexsToSubscribe,
              }),
            );
            reject(ensureError(error));
          });
      }
    });
  }

  /**
   * Ensure clearinghouseState subscription exists for a DEX
   */
  private async ensureClearinghouseStateSubscription(
    userAddress: string,
    dexName: string,
  ): Promise<void> {
    if (this.clearinghouseStateSubscriptions.has(dexName)) {
      return; // Already subscribed
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error('Subscription client not available');
    }

    try {
      const subscription = await subscriptionClient.clearinghouseState(
        {
          user: userAddress,
          dex: dexName || undefined, // Empty string -> undefined for main DEX
        },
        (data: ClearinghouseStateWsEvent) => {
          const cacheKey = data.dex || '';

          // Update caches and notify subscribers if we have positions/account subscribers
          if (
            this.positionSubscriberCount > 0 ||
            this.accountSubscriberCount > 0
          ) {
            // Process positions from clearinghouse state
            const positions = data.clearinghouseState.assetPositions
              .filter((assetPos) => assetPos.position.szi !== '0')
              .map((assetPos) => adaptPositionFromSDK(assetPos));

            // Get cached orders to preserve TP/SL data (prevents flickering)
            // Orders are cached by openOrders subscription
            const cachedOrders = this.dexOrdersCache.get(cacheKey) || [];

            // Re-extract TP/SL from cached orders for the new positions
            // This ensures TP/SL data persists across clearinghouseState updates
            let positionsWithTPSL = positions;
            if (cachedOrders.length > 0) {
              const { tpslMap, tpslCountMap } = this.extractTPSLFromOrders(
                [],
                positions,
                cachedOrders,
              );

              positionsWithTPSL = this.mergeTPSLIntoPositions(
                positions,
                tpslMap,
                tpslCountMap,
              );
            }

            // Update account state
            const accountState: AccountState = adaptAccountStateFromSDK(
              data.clearinghouseState,
              undefined,
            );

            // Update caches
            this.dexPositionsCache.set(cacheKey, positionsWithTPSL);
            this.dexAccountCache.set(cacheKey, accountState);

            // Mark this DEX as initialized (has sent first data)
            this.initializedDexs.add(cacheKey);

            // Trigger aggregation and notify subscribers
            this.aggregateAndNotifySubscribers();
          }
        },
      );

      this.clearinghouseStateSubscriptions.set(dexName, subscription);
      this.deps.debugLogger.log(
        `clearinghouseState subscription established for DEX: ${dexName || 'main'}`,
      );
    } catch (error) {
      // Remove this DEX from expected set so it doesn't block notifications for other DEXs
      this.expectedDexs.delete(dexName);

      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('ensureClearinghouseStateSubscription', {
          dex: dexName,
        }),
      );
      throw error;
    }
  }

  /**
   * Ensure openOrders subscription exists for a DEX
   */
  private async ensureOpenOrdersSubscription(
    userAddress: string,
    dexName: string,
  ): Promise<void> {
    if (this.openOrdersSubscriptions.has(dexName)) {
      return; // Already subscribed
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      throw new Error('Subscription client not available');
    }

    try {
      const subscription = await subscriptionClient.openOrders(
        {
          user: userAddress,
          dex: dexName || undefined, // Empty string -> undefined for main DEX
        },
        (data: OpenOrdersWsEvent) => {
          const cacheKey = data.dex || '';

          // Update caches and notify subscribers if we have order subscribers
          if (
            this.orderSubscriberCount > 0 ||
            this.positionSubscriberCount > 0
          ) {
            // Get cached positions for TP/SL processing
            const cachedPositions = this.dexPositionsCache.get(cacheKey) || [];

            // Extract TP/SL and process orders
            const {
              tpslMap,
              tpslCountMap,
              processedOrders: orders,
            } = this.extractTPSLFromOrders(data.orders, cachedPositions);

            // Update orders cache with processed orders
            this.dexOrdersCache.set(cacheKey, orders);

            // Update positions with TP/SL if we have positions
            if (cachedPositions.length > 0) {
              const positionsWithTPSL = this.mergeTPSLIntoPositions(
                cachedPositions,
                tpslMap,
                tpslCountMap,
              );
              this.dexPositionsCache.set(cacheKey, positionsWithTPSL);
            }

            // Mark this DEX as initialized (has sent first data)
            this.initializedDexs.add(cacheKey);

            // Trigger aggregation and notify subscribers
            this.aggregateAndNotifySubscribers();
          }
        },
      );

      this.openOrdersSubscriptions.set(dexName, subscription);
      this.deps.debugLogger.log(
        `openOrders subscription established for DEX: ${dexName || 'main'}`,
      );
    } catch (error) {
      // Remove this DEX from expected set so it doesn't block notifications for other DEXs
      this.expectedDexs.delete(dexName);

      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('ensureOpenOrdersSubscription', {
          dex: dexName,
        }),
      );
      throw error;
    }
  }

  /**
   * Aggregate data from all DEX caches and notify subscribers if data changed
   * Used by both webData3 callback and fallback subscription callbacks
   */
  private aggregateAndNotifySubscribers(): void {
    // Wait for all expected DEXs to send initial data before notifying
    // This ensures positions from all DEXs appear simultaneously
    if (this.expectedDexs.size > 0) {
      const allDexsInitialized = Array.from(this.expectedDexs).every((dex) =>
        this.initializedDexs.has(dex),
      );
      if (!allDexsInitialized) {
        this.deps.debugLogger.log('Waiting for all DEXs to send initial data', {
          expected: Array.from(this.expectedDexs),
          initialized: Array.from(this.initializedDexs),
        });
        return; // Don't notify yet - waiting for more DEXs
      }
    }

    // Aggregate data from all DEX caches
    // Order: Main DEX (crypto perps) first, then HIP-3 DEXs
    const mainDexPositions = this.dexPositionsCache.get('') || [];
    const hip3DexPositions = Array.from(this.dexPositionsCache.entries())
      .filter(([key]) => key !== '')
      .flatMap(([, positions]) => positions);
    const aggregatedPositions = [...mainDexPositions, ...hip3DexPositions];

    const mainDexOrders = this.dexOrdersCache.get('') || [];
    const hip3DexOrders = Array.from(this.dexOrdersCache.entries())
      .filter(([key]) => key !== '')
      .flatMap(([, orders]) => orders);
    const aggregatedOrders = [...mainDexOrders, ...hip3DexOrders];

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
      this.positionsCacheInitialized = true; // Mark cache as initialized
      this.positionSubscribers.forEach((callback) => {
        callback(aggregatedPositions);
      });
    }

    if (ordersChanged) {
      this.cachedOrders = aggregatedOrders;
      this.cachedOrdersHash = ordersHash;
      this.ordersCacheInitialized = true; // Mark cache as initialized
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
  }

  /**
   * Clean up webData3 subscription when no longer needed
   */
  private cleanupSharedWebData3ISubscription(): void {
    const totalSubscribers =
      this.positionSubscriberCount +
      this.orderSubscriberCount +
      this.accountSubscriberCount +
      this.oiCapSubscriberCount;

    if (totalSubscribers <= 0) {
      // Cleanup webData3 subscription (covers all DEXs)
      if (this.webData3Subscriptions.size > 0) {
        this.webData3Subscriptions.forEach((subscription, dexName) => {
          subscription.unsubscribe().catch((error: Error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext(
                'cleanupSharedWebData3ISubscription.webData3',
                {
                  dex: dexName,
                },
              ),
            );
          });
        });
        this.webData3Subscriptions.clear();
        this.webData3SubscriptionPromise = undefined;
      }

      // Cleanup individual subscriptions (clearinghouseState + openOrders)
      if (this.clearinghouseStateSubscriptions.size > 0) {
        this.clearinghouseStateSubscriptions.forEach(
          (subscription, dexName) => {
            subscription.unsubscribe().catch((error: Error) => {
              this.deps.logger.error(
                ensureError(error),
                this.getErrorContext(
                  'cleanupSharedWebData3ISubscription.clearinghouseState',
                  {
                    dex: dexName,
                  },
                ),
              );
            });
          },
        );
        this.clearinghouseStateSubscriptions.clear();
      }

      if (this.openOrdersSubscriptions.size > 0) {
        this.openOrdersSubscriptions.forEach((subscription, dexName) => {
          subscription.unsubscribe().catch((error: Error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext(
                'cleanupSharedWebData3ISubscription.openOrders',
                {
                  dex: dexName,
                },
              ),
            );
          });
        });
        this.openOrdersSubscriptions.clear();
      }

      // Clear subscriber counts
      this.positionSubscriberCount = 0;
      this.orderSubscriberCount = 0;
      this.accountSubscriberCount = 0;
      this.oiCapSubscriberCount = 0;

      // Clear per-DEX caches
      this.dexPositionsCache.clear();
      this.dexOrdersCache.clear();
      this.dexAccountCache.clear();

      // Clear DEX tracking for synchronized notifications
      this.expectedDexs.clear();
      this.initializedDexs.clear();

      // Clear aggregated caches
      this.cachedPositions = null;
      this.cachedOrders = null;
      this.cachedAccount = null;
      this.ordersCacheInitialized = false; // Reset cache initialization flag
      this.positionsCacheInitialized = false; // Reset cache initialization flag

      // Clear hash caches
      this.cachedPositionsHash = '';
      this.cachedOrdersHash = '';
      this.cachedAccountHash = '';

      this.deps.debugLogger.log(
        'All multi-DEX subscriptions cleaned up (webData2/3 + individual subscriptions)',
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
    this.ensureSharedWebData3Subscription(accountId).catch((error) => {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToPositions'),
      );
    });

    return () => {
      unsubscribe();
      this.positionSubscriberCount--;
      this.cleanupSharedWebData3ISubscription();
    };
  }

  /**
   * Subscribe to open interest cap updates
   * OI caps are extracted from webData2 subscription (zero additional overhead)
   */
  public subscribeToOICaps(params: SubscribeOICapsParams): () => void {
    const { callback, accountId } = params;

    // Create subscription
    const unsubscribe = this.createSubscription(
      this.oiCapSubscribers,
      callback,
    );

    // Increment OI cap subscriber count
    this.oiCapSubscriberCount++;

    // Immediately provide cached data if available
    if (this.cachedOICaps) {
      callback(this.cachedOICaps);
    }

    // Ensure webData3 subscription is active (OI caps come from webData3)
    this.ensureSharedWebData3Subscription(accountId).catch((error) => {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOICaps'),
      );
    });

    return () => {
      unsubscribe();
      this.oiCapSubscriberCount--;
      this.cleanupSharedWebData3ISubscription();
    };
  }

  /**
   * Check if OI caps cache has been initialized
   * Useful for preventing UI flashing before first data arrives
   */
  public isOICapsCacheInitialized(): boolean {
    return this.oiCapsCacheInitialized;
  }

  /**
   * Subscribe to live order fill updates
   * Shares subscriptions per accountId to avoid duplicate WebSocket connections
   */
  public subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    const { callback, accountId } = params;
    // Normalize accountId: undefined -> 'default' for Map key
    const normalizedAccountId = accountId ?? 'default';
    const unsubscribe = this.createSubscription(
      this.orderFillSubscribers,
      callback,
      normalizedAccountId,
    );

    // Ensure subscription is established for this accountId
    this.ensureOrderFillISubscription(accountId).catch((error) => {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOrderFills'),
      );
    });

    return () => {
      unsubscribe();

      // If no more subscribers for this accountId, clean up subscription
      const subscribers = this.orderFillSubscribers.get(normalizedAccountId);
      if (!subscribers || subscribers.size === 0) {
        const subscription =
          this.orderFillSubscriptions.get(normalizedAccountId);
        if (subscription) {
          subscription.unsubscribe().catch((error: Error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext('subscribeToOrderFills.unsubscribe'),
            );
          });
          this.orderFillSubscriptions.delete(normalizedAccountId);
        }
      }
    };
  }

  /**
   * Ensure order fill subscription is active for the given accountId
   * Shares subscription across all callbacks for the same accountId
   */
  private async ensureOrderFillISubscription(
    accountId?: CaipAccountId,
  ): Promise<void> {
    // Normalize accountId: undefined -> 'default' for Map key
    const normalizedAccountId = accountId ?? 'default';

    // If subscription already exists, no need to create another
    if (this.orderFillSubscriptions.has(normalizedAccountId)) {
      return;
    }

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      this.clientService.ensureSubscriptionClient(
        this.walletService.createWalletAdapter(),
      );
      const client = this.clientService.getSubscriptionClient();
      if (!client) {
        throw new Error('SubscriptionClient not available');
      }
      return this.ensureOrderFillISubscription(accountId);
    }

    const userAddress =
      await this.walletService.getUserAddressWithDefault(accountId);

    // userFills returns a Promise<ISubscription>, need to await it
    const subscription = await subscriptionClient.userFills(
      { user: userAddress },
      (data: UserFillsWsEvent) => {
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

        // Distribute to all callbacks for this accountId
        const subscribers = this.orderFillSubscribers.get(normalizedAccountId);
        if (subscribers) {
          subscribers.forEach((callback) => {
            callback(orderFills, data.isSnapshot);
          });
        }
      },
    );

    this.orderFillSubscriptions.set(normalizedAccountId, subscription);
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
    this.ensureSharedWebData3Subscription(accountId).catch((error) => {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToOrders'),
      );
    });

    return () => {
      unsubscribe();
      this.orderSubscriberCount--;
      this.cleanupSharedWebData3ISubscription();
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
    this.ensureSharedWebData3Subscription(accountId).catch((error) => {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('subscribeToAccount'),
      );
    });

    return () => {
      unsubscribe();
      this.accountSubscriberCount--;
      this.cleanupSharedWebData3ISubscription();
    };
  }

  /**
   * Check if orders cache has been initialized from WebSocket
   * @returns true if WebSocket has sent at least one update, false otherwise
   */
  public isOrdersCacheInitialized(): boolean {
    return this.ordersCacheInitialized;
  }

  /**
   * Check if positions cache has been initialized from WebSocket
   * @returns true if WebSocket has sent at least one update, false otherwise
   */
  public isPositionsCacheInitialized(): boolean {
    return this.positionsCacheInitialized;
  }

  /**
   * Get cached positions from WebSocket subscription
   * @returns Cached positions array, or null if not initialized
   */
  public getCachedPositions(): Position[] | null {
    return this.cachedPositions;
  }

  /**
   * Get cached orders from WebSocket subscription
   * @returns Cached orders array, or null if not initialized
   */
  public getCachedOrders(): Order[] | null {
    return this.cachedOrders;
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
      .allMids((data: AllMidsWsEvent) => {
        wsMetrics.messagesReceived++;
        wsMetrics.lastMessageTime = Date.now();

        // Initialize cache if needed
        this.cachedPriceData ??= new Map<string, PriceUpdate>();

        const subscribedSymbols = new Set<string>();

        // Collect all symbols that have subscribers
        for (const [symbol, subscriberSet] of this.priceSubscribers.entries()) {
          if (subscriberSet.size > 0) {
            subscribedSymbols.add(symbol);
          }
        }

        // Track if any subscribed symbol was updated
        let hasUpdates = false;

        // Only process symbols that are actually subscribed to
        for (const symbol in data.mids) {
          // Skip if nobody is subscribed to this symbol
          if (!subscribedSymbols.has(symbol)) {
            continue;
          }

          const price = data.mids[symbol].toString();
          const cachedPrice = this.cachedPriceData.get(symbol);

          // Skip if price hasn't changed
          if (cachedPrice && cachedPrice.price === price) {
            continue;
          }

          // Price changed or new symbol - update cache
          const priceUpdate = this.createPriceUpdate(symbol, price);
          this.cachedPriceData.set(symbol, priceUpdate);
          hasUpdates = true;
        }

        // Only notify subscribers if we actually have updates
        // This prevents unnecessary React re-renders when prices haven't changed
        if (hasUpdates) {
          this.notifyAllPriceSubscribers();
        }
      })
      .then((sub) => {
        this.globalAllMidsSubscription = sub;
        this.deps.debugLogger.log(
          'HyperLiquid: Global allMids subscription established',
        );

        // Notify existing subscribers with any cached data now that subscription is established
        if (this.cachedPriceData && this.cachedPriceData.size > 0) {
          this.notifyAllPriceSubscribers();
        }
      })
      .catch((error) => {
        // Clear the promise on error so it can be retried
        this.globalAllMidsPromise = undefined;

        this.deps.logger.error(
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
        (data: ActiveAssetCtxWsEvent | ActiveSpotAssetCtxWsEvent) => {
          subscriptionMetrics.messagesReceived++;

          if (data.coin === symbol && data.ctx) {
            // Type guard using SDK types: check if this is perps (has funding) or spot (no funding)
            const isPerpsContext = (
              event: ActiveAssetCtxWsEvent | ActiveSpotAssetCtxWsEvent,
            ): event is ActiveAssetCtxWsEvent =>
              'funding' in event.ctx &&
              'openInterest' in event.ctx &&
              'oraclePx' in event.ctx;

            const ctx = data.ctx;

            // Cache market data for consolidation with price updates
            const ctxPrice = ctx.midPx || ctx.markPx;
            const openInterestUSD =
              isPerpsContext(data) && ctxPrice
                ? calculateOpenInterestUSD(data.ctx.openInterest, ctxPrice)
                : NaN;
            const marketData = {
              prevDayPx: ctx.prevDayPx
                ? parseFloat(ctx.prevDayPx.toString())
                : undefined,
              // Cache funding rate from activeAssetCtx for real-time updates
              // SDK defines funding as string (not nullable) in ActiveAssetCtxEvent
              funding: isPerpsContext(data)
                ? parseFloat(data.ctx.funding.toString())
                : undefined,
              openInterest: !isNaN(openInterestUSD)
                ? openInterestUSD
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
        this.deps.debugLogger.log(
          `HyperLiquid: Market data subscription established for ${symbol}`,
        );
      })
      .catch((error) => {
        this.deps.logger.error(
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
      if (subscription && typeof subscription.unsubscribe === 'function') {
        const unsubscribeResult = Promise.resolve(subscription.unsubscribe());

        unsubscribeResult.catch(() => {
          // Ignore errors during cleanup
        });
        this.globalActiveAssetSubscriptions.delete(symbol);
        this.symbolSubscriberCounts.delete(symbol);
      } else if (subscription) {
        // Subscription exists but unsubscribe is not a function or doesn't return a Promise
        // Just clean up the reference
        this.globalActiveAssetSubscriptions.delete(symbol);
        this.symbolSubscriberCounts.delete(symbol);
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
   * Performance: Uses cached meta from dexMetaCache (populated by metaAndAssetCtxs)
   * to avoid redundant meta() API calls during subscription setup
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
    const dexIdentifier = dex ?? 'main DEX';

    // Check cache first - populated by metaAndAssetCtxs in ensureAssetCtxsSubscription
    let perpsMeta = this.dexMetaCache.get(dexKey);

    if (!perpsMeta) {
      // Fallback: fetch meta if not in cache (shouldn't happen in normal flow)
      this.deps.debugLogger.log(
        `Meta cache miss for ${dexIdentifier}, fetching from API`,
      );
      const infoClient = this.clientService.getInfoClient();
      const fetchedMeta = await infoClient.meta({ dex: dex || undefined });
      if (fetchedMeta?.universe) {
        perpsMeta = fetchedMeta;
        this.dexMetaCache.set(dexKey, fetchedMeta);
      }
    }

    if (!perpsMeta?.universe) {
      const errorMessage = `No universe data available for ${dexIdentifier}`;
      throw new Error(errorMessage);
    }

    this.deps.debugLogger.log(
      `Using ${this.dexMetaCache.has(dexKey) ? 'cached' : 'fetched'} meta for ${dexIdentifier}`,
      {
        dex,
        universeCount: perpsMeta.universe.length,
        firstAssetSample: perpsMeta.universe[0]?.name,
      },
    );

    return new Promise<void>((resolve, reject) => {
      const subscriptionParams = dex ? { dex } : {};

      subscriptionClient
        .assetCtxs(subscriptionParams, (data: AssetCtxsWsEvent) => {
          // Cache asset contexts for this DEX
          this.dexAssetCtxsCache.set(dexKey, data.ctxs);

          // Use cached meta to map ctxs array indices to symbols (no REST API call!)
          perpsMeta.universe.forEach((asset, index) => {
            const ctx = data.ctxs[index];
            if (ctx && 'funding' in ctx) {
              // This is a perps context
              const ctxPrice = ctx.midPx || ctx.markPx;
              const openInterestUSD = calculateOpenInterestUSD(
                ctx.openInterest,
                ctxPrice,
              );
              const marketData = {
                prevDayPx: ctx.prevDayPx
                  ? parseFloat(ctx.prevDayPx.toString())
                  : undefined,
                funding: parseFloat(ctx.funding.toString()),
                openInterest: !isNaN(openInterestUSD)
                  ? openInterestUSD
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
          this.notifyAllPriceSubscribers();
        })
        .then((sub) => {
          this.assetCtxsSubscriptions.set(dexKey, sub);
          this.deps.debugLogger.log(
            `assetCtxs subscription established for ${
              dex ? `DEX: ${dex}` : 'main DEX'
            }`,
          );
          resolve();
        })
        .catch((error) => {
          this.deps.logger.error(
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
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('cleanupAssetCtxsSubscription', { dex }),
          );
        });

        this.assetCtxsSubscriptions.delete(dexKey);
        this.dexAssetCtxsCache.delete(dexKey);
        this.assetCtxsSubscriptionPromises.delete(dexKey);
        this.dexSubscriberCounts.delete(dexKey);

        this.deps.debugLogger.log(
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
        this.deps.debugLogger.log(
          `HyperLiquid: L2 book subscription established for ${symbol}`,
        );
      })
      .catch((error) => {
        this.deps.logger.error(
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
    if (subscription && typeof subscription.unsubscribe === 'function') {
      const unsubscribeResult = Promise.resolve(subscription.unsubscribe());
      unsubscribeResult.catch(() => {
        // Ignore errors during cleanup
      });

      this.globalL2BookSubscriptions.delete(symbol);
      this.orderBookCache.delete(symbol);
    } else if (subscription) {
      // Subscription exists but unsubscribe is not a function or doesn't return a Promise
      // Just clean up the reference
      this.globalL2BookSubscriptions.delete(symbol);
      this.orderBookCache.delete(symbol);
    }
  }

  /**
   * Subscribe to full order book updates with multiple depth levels
   * Creates a dedicated L2Book subscription for the requested symbol
   * and processes data into OrderBookData format for UI consumption
   *
   * @param params - Subscription parameters
   * @returns Cleanup function to unsubscribe
   */
  public subscribeToOrderBook(params: SubscribeOrderBookParams): () => void {
    const {
      symbol,
      levels = 10,
      nSigFigs = 5,
      mantissa,
      callback,
      onError,
    } = params;

    this.clientService.ensureSubscriptionClient(
      this.walletService.createWalletAdapter(),
    );

    const subscriptionClient = this.clientService.getSubscriptionClient();
    if (!subscriptionClient) {
      const error = new Error('Subscription client not available');
      onError?.(error);
      this.deps.debugLogger.log(
        'subscribeToOrderBook: Subscription client not available',
      );
      return () => {
        // No-op cleanup
      };
    }

    let subscription: ISubscription | undefined;
    let cancelled = false;

    subscriptionClient
      .l2Book({ coin: symbol, nSigFigs, mantissa }, (data: L2BookResponse) => {
        if (cancelled || data?.coin !== symbol || !data?.levels) {
          return;
        }

        const orderBookData = this.processOrderBookData(data, levels);
        callback(orderBookData);
      })
      .then((sub) => {
        if (cancelled) {
          sub.unsubscribe().catch((error: Error) => {
            this.deps.logger.error(
              ensureError(error),
              this.getErrorContext('subscribeToOrderBook.cleanup', { symbol }),
            );
          });
        } else {
          subscription = sub;
          this.deps.debugLogger.log(
            `HyperLiquid: Order book subscription established for ${symbol}`,
          );
        }
      })
      .catch((error) => {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('subscribeToOrderBook', { symbol }),
        );
        onError?.(ensureError(error));
      });

    return () => {
      cancelled = true;
      if (subscription) {
        subscription.unsubscribe().catch((error: Error) => {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('subscribeToOrderBook.unsubscribe', {
              symbol,
            }),
          );
        });
      }
    };
  }

  /**
   * Process raw L2Book data into OrderBookData format
   * Calculates cumulative totals, notional values, and spread metrics
   *
   * @param data - Raw L2Book response from WebSocket
   * @param levels - Number of levels to return per side
   * @returns Processed OrderBookData
   */
  private processOrderBookData(
    data: L2BookResponse,
    levels: number,
  ): OrderBookData {
    const bidsRaw = data?.levels?.[0] || [];
    const asksRaw = data?.levels?.[1] || [];

    // Process bids (buy orders) - highest price first
    let bidCumulativeSize = 0;
    let bidCumulativeNotional = 0;
    const bids: OrderBookLevel[] = bidsRaw.slice(0, levels).map((level) => {
      const price = parseFloat(level.px);
      const size = parseFloat(level.sz);
      const notional = price * size;
      bidCumulativeSize += size;
      bidCumulativeNotional += notional;

      return {
        price: level.px,
        size: level.sz,
        total: bidCumulativeSize.toString(),
        notional: notional.toFixed(2),
        totalNotional: bidCumulativeNotional.toFixed(2),
      };
    });

    // Process asks (sell orders) - lowest price first
    let askCumulativeSize = 0;
    let askCumulativeNotional = 0;
    const asks: OrderBookLevel[] = asksRaw.slice(0, levels).map((level) => {
      const price = parseFloat(level.px);
      const size = parseFloat(level.sz);
      const notional = price * size;
      askCumulativeSize += size;
      askCumulativeNotional += notional;

      return {
        price: level.px,
        size: level.sz,
        total: askCumulativeSize.toString(),
        notional: notional.toFixed(2),
        totalNotional: askCumulativeNotional.toFixed(2),
      };
    });

    // Calculate spread and mid price
    const bestBid = bids[0];
    const bestAsk = asks[0];
    const bidPrice = bestBid ? parseFloat(bestBid.price) : 0;
    const askPrice = bestAsk ? parseFloat(bestAsk.price) : 0;
    const spread = askPrice > 0 && bidPrice > 0 ? askPrice - bidPrice : 0;
    const midPrice =
      askPrice > 0 && bidPrice > 0 ? (askPrice + bidPrice) / 2 : 0;
    const spreadPercentage =
      midPrice > 0 ? ((spread / midPrice) * 100).toFixed(4) : '0';

    // Calculate max total for depth chart scaling
    const maxTotal = Math.max(bidCumulativeSize, askCumulativeSize).toString();

    return {
      bids,
      asks,
      spread: spread.toFixed(5),
      spreadPercentage,
      midPrice: midPrice.toFixed(5),
      lastUpdated: Date.now(),
      maxTotal,
    };
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
   * Restore all active subscriptions after WebSocket reconnection
   * Re-establishes WebSocket subscriptions for all active subscribers
   */
  public async restoreSubscriptions(): Promise<void> {
    // Re-establish global allMids subscription if there are price subscribers
    if (this.priceSubscribers.size > 0) {
      // Clear existing subscription reference (it's dead after reconnection)
      this.globalAllMidsSubscription = undefined;
      this.globalAllMidsPromise = undefined;

      // Re-establish the subscription
      this.ensureGlobalAllMidsSubscription();
    }

    // Re-establish order fill subscriptions if there are fill subscribers
    if (this.orderFillSubscribers.size > 0) {
      // Clear existing subscription references (they're dead after reconnection)
      this.orderFillSubscriptions.clear();

      // Re-establish subscriptions for all accountIds with subscribers
      // Note: normalizedAccountId is 'default' for undefined, need to convert back
      const normalizedAccountIds = Array.from(this.orderFillSubscribers.keys());
      await Promise.all(
        normalizedAccountIds.map((normalizedAccountId) => {
          // Convert normalized key back to original accountId (undefined if 'default')
          const accountId =
            normalizedAccountId === 'default'
              ? undefined
              : (normalizedAccountId as CaipAccountId);
          return this.ensureOrderFillISubscription(accountId).catch(() => {
            // Ignore errors during order fill subscription restoration
          });
        }),
      );
    }

    // Re-establish user data subscriptions if there are user data subscribers
    if (
      this.positionSubscribers.size > 0 ||
      this.orderSubscribers.size > 0 ||
      this.accountSubscribers.size > 0 ||
      this.oiCapSubscribers.size > 0
    ) {
      // Clear existing subscription references (they're dead after reconnection)
      this.webData3Subscriptions.clear();
      this.webData3SubscriptionPromise = undefined;

      // Clear individual subscriptions (clearinghouseState + openOrders) for HIP-3 mode
      this.clearinghouseStateSubscriptions.clear();
      this.openOrdersSubscriptions.clear();

      // Re-establish the subscription (will use current account)
      // This will set up webData2 for non-HIP-3, or individual subscriptions + webData3 (OI caps only) for HIP-3
      await this.ensureSharedWebData3Subscription();
    }

    // Re-establish activeAsset subscriptions if there are market data subscribers
    if (this.marketDataSubscribers.size > 0) {
      // Clear existing subscriptions (they're dead after reconnection)
      this.globalActiveAssetSubscriptions.clear();
      // Clear reference counts to prevent double-counting after reconnection
      this.symbolSubscriberCounts.clear();

      // Re-establish subscriptions for all symbols with market data subscribers
      const symbolsNeedingMarketData = Array.from(
        this.marketDataSubscribers.keys(),
      );
      symbolsNeedingMarketData.forEach((symbol) => {
        this.ensureActiveAssetSubscription(symbol);
      });
    }

    // Re-establish L2Book subscriptions if there are order book subscribers
    if (this.orderBookSubscribers.size > 0) {
      // Clear existing subscriptions (they're dead after reconnection)
      this.globalL2BookSubscriptions.clear();

      // Re-establish subscriptions for all symbols with order book subscribers
      const symbolsNeedingOrderBook = Array.from(
        this.orderBookSubscribers.keys(),
      );
      symbolsNeedingOrderBook.forEach((symbol) => {
        this.ensureL2BookSubscription(symbol);
      });
    }

    // Re-establish assetCtxs subscriptions if there are market data subscribers
    if (this.marketDataSubscribers.size > 0) {
      // Clear existing subscriptions (they're dead after reconnection)
      this.assetCtxsSubscriptions.clear();
      this.assetCtxsSubscriptionPromises.clear();
      // Clear reference counts to prevent double-counting after reconnection
      this.dexSubscriberCounts.clear();

      // Re-establish subscriptions for all DEXs with market data subscribers
      const dexsNeeded = new Set<string>();
      this.marketDataSubscribers.forEach((_subscribers, symbol) => {
        const { dex } = parseAssetName(symbol);
        if (dex) {
          dexsNeeded.add(dex);
        }
      });

      // Add main DEX if any main DEX symbols have subscribers
      const hasMainDexSubscribers = Array.from(
        this.marketDataSubscribers.keys(),
      ).some((symbol) => {
        const { dex } = parseAssetName(symbol);
        return !dex;
      });
      if (hasMainDexSubscribers) {
        dexsNeeded.add('');
      }

      // Re-establish subscriptions
      await Promise.all(
        Array.from(dexsNeeded).map((dex) =>
          this.ensureAssetCtxsSubscription(dex).catch(() => {
            // Ignore errors during assetCtxs subscription restoration
          }),
        ),
      );
    }
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
    this.orderBookSubscribers.clear();

    // Clear order fill subscriptions
    this.orderFillSubscriptions.forEach((subscription) => {
      subscription.unsubscribe().catch(() => {
        // Ignore errors during cleanup
      });
    });
    this.orderFillSubscriptions.clear();

    // Clear cached data
    this.cachedPriceData = null;
    this.cachedPositions = null;
    this.cachedOrders = null;
    this.cachedAccount = null;
    this.ordersCacheInitialized = false; // Reset cache initialization flag
    this.positionsCacheInitialized = false; // Reset cache initialization flag
    this.marketDataCache.clear();
    this.orderBookCache.clear();
    this.symbolSubscriberCounts.clear();
    this.dexSubscriberCounts.clear();

    // Clear hash caches
    this.cachedPositionsHash = '';
    this.cachedOrdersHash = '';
    this.cachedAccountHash = '';

    // Clear multi-DEX caches
    this.deps.debugLogger.log(
      'HyperLiquidSubscriptionService: Clearing per-DEX caches',
      {
        dexPositionsCacheSize: this.dexPositionsCache.size,
        dexOrdersCacheSize: this.dexOrdersCache.size,
        dexAccountCacheSize: this.dexAccountCache.size,
        dexAssetCtxsCacheSize: this.dexAssetCtxsCache.size,
        dexPositionsCacheKeys: Array.from(this.dexPositionsCache.keys()),
        dexAssetCtxsCacheKeys: Array.from(this.dexAssetCtxsCache.keys()),
      },
    );

    this.dexPositionsCache.clear();
    this.dexOrdersCache.clear();
    this.dexAccountCache.clear();
    this.dexAssetCtxsCache.clear();

    // Clear subscription references (actual cleanup handled by client service)
    this.globalAllMidsSubscription = undefined;
    this.globalActiveAssetSubscriptions.clear();
    this.globalL2BookSubscriptions.clear();
    this.webData3Subscriptions.clear();
    this.webData3SubscriptionPromise = undefined;

    // HIP-3: Clear assetCtxs subscriptions (clearinghouseState no longer needed with webData3)
    this.assetCtxsSubscriptions.clear();
    this.assetCtxsSubscriptionPromises.clear();

    // Cleanup individual subscriptions (clearinghouseState + openOrders)
    if (this.clearinghouseStateSubscriptions.size > 0) {
      this.clearinghouseStateSubscriptions.forEach((subscription, dexName) => {
        subscription.unsubscribe().catch((error: Error) => {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('clearAll.clearinghouseState', {
              dex: dexName,
            }),
          );
        });
      });
      this.clearinghouseStateSubscriptions.clear();
    }

    if (this.openOrdersSubscriptions.size > 0) {
      this.openOrdersSubscriptions.forEach((subscription, dexName) => {
        subscription.unsubscribe().catch((error: Error) => {
          this.deps.logger.error(
            ensureError(error),
            this.getErrorContext('clearAll.openOrders', {
              dex: dexName,
            }),
          );
        });
      });
      this.openOrdersSubscriptions.clear();
    }

    this.deps.debugLogger.log(
      'HyperLiquid: Subscription service cleared (multi-DEX with individual subscriptions)',
      {
        timestamp: new Date().toISOString(),
      },
    );
  }
}
