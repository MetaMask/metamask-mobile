/**
 * MYXProvider
 *
 * Implements the IPerpsProvider interface for MYX Protocol.
 * MYX uses a Multi-Pool Model (MPM) with USDT collateral on BNB Chain.
 *
 * Key differences from HyperLiquidProvider:
 * - Pool-based architecture (each market can have multiple pools)
 * - USDT collateral instead of USDC
 * - Direction enum (LONG=0, SHORT=1) vs signed size
 * - Different decimal formats (30 decimals for prices, 18 for sizes)
 * - Separate increase/decrease order methods
 */

import type { CaipAccountId } from '@metamask/utils';
import { ensureError } from '../../../../../util/errorUtils';
import {
  getMYXBridgeInfo,
  getMYXSupportedAssets,
  MYX_FEE_RATES,
  MYX_WITHDRAWAL_CONFIG,
  toMYXPrice,
  toMYXSize,
  toMYXCollateral,
} from '../../constants/myxConfig';
import {
  PERPS_CONSTANTS,
  ORDER_SLIPPAGE_CONFIG,
} from '../../constants/perpsConfig';
import { MYXClientService } from '../../services/MYXClientService';
import { MYXSubscriptionService } from '../../services/MYXSubscriptionService';
import { MYXWalletService } from '../../services/MYXWalletService';
import {
  adaptMarketFromMYX,
  adaptPositionFromMYX,
  adaptOrderFromMYX,
  adaptAccountStateFromMYX,
  adaptOrderToMYX,
} from '../../utils/myxAdapter';
import {
  MYXOrderType,
  MYXDirection,
  MYXTriggerType,
  MYXTimeInForce,
  type MYXAccountInfo,
  type MYXKlineResolution,
} from '../../types/myx-types';
import type {
  AccountState,
  AssetRoute,
  BatchCancelOrdersParams,
  CancelOrderParams,
  CancelOrderResult,
  CancelOrdersResult,
  ClosePositionParams,
  ClosePositionsParams,
  ClosePositionsResult,
  DepositParams,
  DisconnectResult,
  EditOrderParams,
  FeeCalculationParams,
  FeeCalculationResult,
  Funding,
  GetAccountStateParams,
  GetFundingParams,
  GetMarketsParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  InitializeResult,
  IPerpsProvider,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarginResult,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsMarketData,
  Position,
  ReadyToTradeResult,
  SubscribeAccountParams,
  SubscribeCandlesParams,
  SubscribeOICapsParams,
  SubscribeOrderBookParams,
  SubscribeOrderFillsParams,
  SubscribeOrdersParams,
  SubscribePositionsParams,
  SubscribePricesParams,
  ToggleTestnetResult,
  UpdatePositionTPSLParams,
  UpdateMarginParams,
  WithdrawParams,
  WithdrawResult,
  GetHistoricalPortfolioParams,
  HistoricalPortfolioResult,
  UserHistoryItem,
  IPerpsPlatformDependencies,
} from '../types';
import type { RawHyperLiquidLedgerUpdate } from '../../utils/hyperLiquidAdapter';

/**
 * MYX Protocol provider implementation
 *
 * Implements IPerpsProvider interface for MYX perpetuals.
 * Delegates to service classes for client management, wallet integration, and subscriptions.
 */
export class MYXProvider implements IPerpsProvider {
  readonly protocolId = 'myx';

  // Service instances
  private clientService: MYXClientService;
  private walletService: MYXWalletService;
  private subscriptionService: MYXSubscriptionService;

  // Platform dependencies for logging
  private readonly deps: IPerpsPlatformDependencies;

  // Track initialization state
  private isInitialized = false;
  private initializationPromise: Promise<InitializeResult> | null = null;

  // Lazy initialization state (separate from initialize() for connection validation)
  private clientsInitialized = false;
  private clientsInitializationPromise: Promise<void> | null = null;

  // Cache for markets
  private cachedMarkets: MarketInfo[] = [];
  private marketsLastUpdated = 0;
  private readonly MARKETS_CACHE_TTL_MS = 60_000; // 1 minute

  constructor(options: {
    isTestnet?: boolean;
    platformDependencies: IPerpsPlatformDependencies;
  }) {
    this.deps = options.platformDependencies;
    const isTestnet = options.isTestnet ?? false;

    // Initialize services with injected platform dependencies
    this.clientService = new MYXClientService(this.deps, { isTestnet });
    this.walletService = new MYXWalletService(this.deps, { isTestnet });
    this.subscriptionService = new MYXSubscriptionService(
      this.clientService,
      this.walletService,
      this.deps,
    );

    this.deps.debugLogger.log('[MYXProvider] Constructor complete', {
      protocolId: this.protocolId,
      isTestnet,
    });
  }

  /**
   * Get error context for Sentry logging
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
        name: 'MYXProvider',
        data: {
          method,
          ...extra,
        },
      },
    };
  }

  // ============================================================================
  // Lazy Client Initialization
  // ============================================================================

  /**
   * Lazy initialization of MYX SDK clients.
   * Called on first API operation to ensure client is ready.
   * This pattern matches HyperLiquidProvider's ensureClientsInitialized approach.
   */
  private async ensureClientsInitialized(): Promise<void> {
    if (this.clientsInitialized) {
      return;
    }

    if (this.clientsInitializationPromise) {
      return this.clientsInitializationPromise;
    }

    this.clientsInitializationPromise = this.doClientsInitialization();

    try {
      await this.clientsInitializationPromise;
    } finally {
      this.clientsInitializationPromise = null;
    }
  }

  private async doClientsInitialization(): Promise<void> {
    try {
      this.deps.debugLogger.log('[MYXProvider] Lazy initialization starting');

      const signer = this.walletService.createSignerAdapter();
      await this.clientService.initialize(signer);
      await this.subscriptionService.initializeCaches();

      this.clientsInitialized = true;

      this.deps.debugLogger.log('[MYXProvider] Lazy initialization complete');
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('ensureClientsInitialized'),
      );
      throw error;
    }
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async initialize(): Promise<InitializeResult> {
    try {
      await this.ensureClientsInitialized();
      this.isInitialized = true;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    try {
      await this.ensureClientsInitialized();
    } catch (error) {
      return {
        ready: false,
        error: ensureError(error).message,
      };
    }

    try {
      const client = this.clientService.getClient();
      if (!client) {
        return {
          ready: false,
          error: 'MYX client not available',
        };
      }

      const address = this.walletService.getCurrentUserAddress();
      if (!address) {
        return {
          ready: false,
          error: 'No wallet address available',
        };
      }

      return { ready: true };
    } catch (error) {
      return {
        ready: false,
        error: ensureError(error).message,
      };
    }
  }

  async disconnect(): Promise<DisconnectResult> {
    try {
      await this.subscriptionService.disconnect();
      await this.clientService.disconnect();

      this.isInitialized = false;
      this.clientsInitialized = false;

      this.deps.debugLogger.log('[MYXProvider] Disconnected');
      return { success: true };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('disconnect'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async toggleTestnet(): Promise<ToggleTestnetResult> {
    try {
      const currentIsTestnet = this.clientService.isTestnetMode();
      const newIsTestnet = !currentIsTestnet;

      // Disconnect current connections
      await this.disconnect();

      // Update service configurations
      this.clientService.setTestnetMode(newIsTestnet);
      this.walletService.setTestnetMode(newIsTestnet);

      // Reinitialize
      await this.initialize();

      return {
        success: true,
        isTestnet: newIsTestnet,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('toggleTestnet'),
      );
      return {
        success: false,
        isTestnet: this.clientService.isTestnetMode(),
        error: ensureError(error).message,
      };
    }
  }

  async ping(timeoutMs = 5000): Promise<void> {
    await this.ensureClientsInitialized();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Ping timeout')), timeoutMs),
    );

    const pingPromise = this.clientService.getPools();

    await Promise.race([pingPromise, timeoutPromise]);
  }

  // ============================================================================
  // Market Data
  // ============================================================================

  async getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]> {
    await this.ensureClientsInitialized();

    try {
      const now = Date.now();
      if (
        this.cachedMarkets.length > 0 &&
        now - this.marketsLastUpdated < this.MARKETS_CACHE_TTL_MS
      ) {
        // Apply symbol filter if provided
        const symbolFilter = params?.symbols;
        if (symbolFilter && symbolFilter.length > 0) {
          return this.cachedMarkets.filter((m) =>
            symbolFilter.includes(m.name),
          );
        }
        return this.cachedMarkets;
      }

      // Fetch pools from MYX
      const pools = await this.clientService.getPools();

      // Convert to MarketInfo format
      const markets: MarketInfo[] = pools.map((pool) =>
        adaptMarketFromMYX(pool),
      );

      // Update cache
      this.cachedMarkets = markets;
      this.marketsLastUpdated = now;

      // Apply symbol filter if provided
      const symbols = params?.symbols;
      if (symbols && symbols.length > 0) {
        return markets.filter((m) => symbols.includes(m.name));
      }

      return markets;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getMarkets'),
      );
      throw error;
    }
  }

  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    try {
      const markets = await this.getMarkets();

      // Get tickers for all markets
      const marketData: PerpsMarketData[] = await Promise.all(
        markets.map(async (market) => {
          const cachedPrice = this.subscriptionService.getCachedPrice(
            market.name,
          );

          return {
            symbol: market.name,
            name: market.name,
            maxLeverage: `${market.maxLeverage}x`,
            price: cachedPrice?.price || '0',
            change24h: cachedPrice?.percentChange24h || '0',
            change24hPercent: cachedPrice?.percentChange24h || '0',
            volume: cachedPrice?.volume24h?.toString() || '0',
            openInterest: cachedPrice?.openInterest?.toString() || '0',
            fundingRate: cachedPrice?.funding,
          };
        }),
      );

      return marketData;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getMarketDataWithPrices'),
      );
      throw error;
    }
  }

  // ============================================================================
  // Account & Positions
  // ============================================================================

  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    await this.ensureClientsInitialized();

    try {
      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Get account info from all pools with positions
      const positions = await this.getPositions(params);
      const poolIds = new Set<string>();

      for (const position of positions) {
        const poolId = await this.clientService.getPoolIdForSymbol(
          position.coin,
        );
        if (poolId) {
          poolIds.add(poolId);
        }
      }

      // Fetch account info for each pool
      const accountInfos: MYXAccountInfo[] = [];
      for (const poolId of poolIds) {
        const info = await this.clientService.getAccountInfo(
          userAddress,
          poolId,
        );
        if (info) {
          accountInfos.push(info);
        }
      }

      // Aggregate account state
      return adaptAccountStateFromMYX(accountInfos);
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getAccountState'),
      );
      throw error;
    }
  }

  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    await this.ensureClientsInitialized();

    try {
      if (!params?.skipCache) {
        const cachedPositions = this.subscriptionService.getCachedPositions();
        if (cachedPositions.length > 0) {
          return cachedPositions;
        }
      }

      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Fetch positions from API
      const myxPositions = await this.clientService.getPositions(userAddress);

      // Convert to MetaMask format
      const positions: Position[] = [];
      for (const pos of myxPositions) {
        const symbol = await this.clientService.getSymbolForPoolId(pos.poolId);
        if (symbol) {
          const position = adaptPositionFromMYX(pos);
          position.coin = symbol; // Override with resolved symbol
          positions.push(position);
        }
      }

      return positions;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getPositions'),
      );
      throw error;
    }
  }

  // ============================================================================
  // Orders
  // ============================================================================

  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    await this.ensureClientsInitialized();

    try {
      if (!params?.skipCache) {
        const cachedOrders = this.subscriptionService.getCachedOrders();
        if (cachedOrders.length > 0) {
          return cachedOrders;
        }
      }

      const userAddress = await this.walletService.getUserAddressWithDefault(
        params?.accountId,
      );

      // Fetch orders from API
      const myxOrders = await this.clientService.getOpenOrders(userAddress);

      // Convert to MetaMask format
      const orders: Order[] = [];
      for (const order of myxOrders) {
        const symbol = await this.clientService.getSymbolForPoolId(
          order.poolId,
        );
        if (symbol) {
          // Create a simple poolId -> symbol map for the adapter
          const poolSymbolMap = new Map<string, string>();
          poolSymbolMap.set(order.poolId, symbol);
          orders.push(adaptOrderFromMYX(order, poolSymbolMap));
        }
      }

      return orders;
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('getOrders'),
      );
      throw error;
    }
  }

  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    return this.getOrders(params);
  }

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Placing order', params);

      const userAddress = this.walletService.getCurrentUserAddress();
      const chainId = this.walletService.getChainId();

      // Get pool ID for the coin
      const poolId = await this.clientService.getPoolIdForSymbol(params.coin);
      if (!poolId) {
        return {
          success: false,
          error: `No pool found for ${params.coin}`,
        };
      }

      // Build order params for MYX SDK
      const { params: myxOrderParams, isIncrease } = adaptOrderToMYX(params, {
        poolId,
        positionId: '0', // New position
        userAddress,
        chainId,
        executionFeeToken: userAddress, // Pay with wallet's native token
        existingPosition: undefined,
      });

      // Place order via client service
      const result = isIncrease
        ? await this.clientService.createIncreaseOrder(myxOrderParams)
        : await this.clientService.createDecreaseOrder(myxOrderParams);

      if (result.success && result.orderId) {
        return {
          success: true,
          orderId: result.orderId,
        };
      }

      return {
        success: false,
        error: result.error || 'Order placement failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('placeOrder'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Editing order', params);

      // MYX only supports updating TP/SL, price, and size
      const userAddress = this.walletService.getCurrentUserAddress();

      const result = await this.clientService.updateOrder({
        orderId: String(params.orderId),
        size: params.newOrder.size
          ? toMYXSize(params.newOrder.size)
          : undefined,
        price: params.newOrder.price
          ? toMYXPrice(params.newOrder.price)
          : undefined,
        executionFeeToken: userAddress,
      });

      if (result.success) {
        return {
          success: true,
          orderId: String(params.orderId),
        };
      }

      return {
        success: false,
        error: result.error || 'Order update failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('editOrder'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Canceling order', params);

      const result = await this.clientService.cancelOrder(params.orderId);

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrder'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async cancelOrders(
    params: BatchCancelOrdersParams,
  ): Promise<CancelOrdersResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Canceling orders', params);

      const results: CancelOrdersResult['results'] = [];

      // MYX may support batch cancel - for now, cancel one by one
      for (const { orderId, coin } of params) {
        const result = await this.cancelOrder({ orderId, coin });
        results.push({
          orderId,
          coin,
          success: result.success,
          error: result.error,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('cancelOrders'),
      );
      return {
        success: false,
        successCount: 0,
        failureCount: params.length,
        results: params.map(({ orderId, coin }) => ({
          orderId,
          coin,
          success: false,
          error: ensureError(error).message,
        })),
      };
    }
  }

  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Closing position', params);

      // Get current position
      const positions = await this.getPositions();
      const position = positions.find((p) => p.coin === params.coin);

      if (!position) {
        return {
          success: false,
          error: `No position found for ${params.coin}`,
        };
      }

      const userAddress = this.walletService.getCurrentUserAddress();
      const chainId = this.walletService.getChainId();

      // Get pool ID
      const poolId = await this.clientService.getPoolIdForSymbol(params.coin);
      if (!poolId) {
        return {
          success: false,
          error: `No pool found for ${params.coin}`,
        };
      }

      // Determine close size (full position if not specified)
      const closeSize = params.size || Math.abs(parseFloat(position.size));

      // Direction is opposite of position direction for closing
      const isLong = parseFloat(position.size) > 0;
      const direction = isLong ? MYXDirection.LONG : MYXDirection.SHORT;

      // Build decrease order params
      // Note: Position type doesn't have positionId - use '0' as default for MYX
      const myxOrderParams = {
        chainId,
        address: userAddress as string,
        poolId,
        positionId: '0',
        orderType: MYXOrderType.MARKET,
        triggerType: MYXTriggerType.NONE,
        direction,
        collateralAmount: '0',
        size: toMYXSize(closeSize),
        price: toMYXPrice(0), // Market order
        timeInForce: MYXTimeInForce.IOC,
        postOnly: false,
        slippagePct: (
          ORDER_SLIPPAGE_CONFIG.DEFAULT_MARKET_SLIPPAGE_BPS / 100
        ).toString(),
        executionFeeToken: userAddress as string,
        leverage: position.leverage.value,
      };

      const result =
        await this.clientService.createDecreaseOrder(myxOrderParams);

      if (result.success && result.orderId) {
        return {
          success: true,
          orderId: result.orderId,
        };
      }

      return {
        success: false,
        error: result.error || 'Position close failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('closePosition'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async closePositions(
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Closing positions', params);

      const results: ClosePositionsResult['results'] = [];

      // Get coins to close - either specified or all positions
      let coinsToClose = params.coins || [];
      if (params.closeAll || coinsToClose.length === 0) {
        const positions = await this.getPositions();
        coinsToClose = positions.map((p) => p.coin);
      }

      for (const coin of coinsToClose) {
        const result = await this.closePosition({ coin });
        results.push({
          coin,
          success: result.success ?? false,
          error: result.error,
        });
      }

      const successCount = results.filter((r) => r.success).length;
      const failureCount = results.filter((r) => !r.success).length;

      return {
        success: successCount > 0,
        successCount,
        failureCount,
        results,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('closePositions'),
      );
      const coinsToClose = params.coins || [];
      return {
        success: false,
        successCount: 0,
        failureCount: coinsToClose.length,
        results: coinsToClose.map((coin) => ({
          coin,
          success: false,
          error: ensureError(error).message,
        })),
      };
    }
  }

  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log(
        '[MYXProvider] Updating position TP/SL',
        params,
      );

      // Get current position
      const positions = await this.getPositions();
      const position = positions.find((p) => p.coin === params.coin);

      if (!position) {
        return {
          success: false,
          error: `No position found for ${params.coin}`,
        };
      }

      const userAddress = this.walletService.getCurrentUserAddress();
      const chainId = this.walletService.getChainId();

      // Get pool ID
      const poolId = await this.clientService.getPoolIdForSymbol(params.coin);
      if (!poolId) {
        return {
          success: false,
          error: `No pool found for ${params.coin}`,
        };
      }

      const isLong = parseFloat(position.size) > 0;
      const direction = isLong ? MYXDirection.LONG : MYXDirection.SHORT;

      // Determine trigger types
      const tpTriggerType = isLong
        ? MYXTriggerType.GTE // TP triggers when price >= target for longs
        : MYXTriggerType.LTE; // TP triggers when price <= target for shorts
      const slTriggerType = isLong
        ? MYXTriggerType.LTE // SL triggers when price <= target for longs
        : MYXTriggerType.GTE; // SL triggers when price >= target for shorts

      // Note: Position type doesn't have positionId - use '0' as default for MYX
      const result = await this.clientService.createPositionTpSlOrder({
        chainId,
        address: userAddress as string,
        poolId,
        positionId: '0',
        executionFeeToken: userAddress as string,
        tpTriggerType: params.takeProfitPrice
          ? tpTriggerType
          : MYXTriggerType.NONE,
        slTriggerType: params.stopLossPrice
          ? slTriggerType
          : MYXTriggerType.NONE,
        direction,
        leverage: position.leverage.value,
        tpSize: params.takeProfitPrice
          ? toMYXSize(Math.abs(parseFloat(position.size)))
          : undefined,
        tpPrice: params.takeProfitPrice
          ? toMYXPrice(params.takeProfitPrice)
          : undefined,
        slSize: params.stopLossPrice
          ? toMYXSize(Math.abs(parseFloat(position.size)))
          : undefined,
        slPrice: params.stopLossPrice
          ? toMYXPrice(params.stopLossPrice)
          : undefined,
      });

      if (result.success) {
        return {
          success: true,
        };
      }

      return {
        success: false,
        error: result.error || 'TP/SL update failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updatePositionTPSL'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  async updateMargin(params: UpdateMarginParams): Promise<MarginResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Updating margin', params);

      const userAddress = this.walletService.getCurrentUserAddress();

      // Get pool ID
      const poolId = await this.clientService.getPoolIdForSymbol(params.coin);
      if (!poolId) {
        return {
          success: false,
          error: `No pool found for ${params.coin}`,
        };
      }

      // Determine if adding or removing based on amount sign
      // Positive = add margin, Negative = remove margin
      const amountNum = parseFloat(params.amount);
      const isAdd = amountNum >= 0;

      const result = await this.clientService.adjustCollateral({
        userAddress,
        poolId,
        amount: toMYXCollateral(Math.abs(amountNum)),
        isAdd,
      });

      return {
        success: result.success,
        error: result.error,
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('updateMargin'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  // ============================================================================
  // Historical Data
  // ============================================================================

  async getOrderFills(_params?: GetOrderFillsParams): Promise<OrderFill[]> {
    // MYX SDK doesn't expose order fill history yet (blocker from analysis)
    this.deps.debugLogger.log(
      '[MYXProvider] getOrderFills not yet implemented',
    );
    return [];
  }

  async getFunding(_params?: GetFundingParams): Promise<Funding[]> {
    // MYX SDK doesn't expose funding history yet (blocker from analysis)
    this.deps.debugLogger.log('[MYXProvider] getFunding not yet implemented');
    return [];
  }

  async getHistoricalPortfolio(
    _params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    // MYX SDK doesn't expose historical portfolio yet
    this.deps.debugLogger.log(
      '[MYXProvider] getHistoricalPortfolio not yet implemented',
    );
    return {
      accountValue1dAgo: '0',
      timestamp: Date.now() - 24 * 60 * 60 * 1000, // 1 day ago
    };
  }

  async getUserNonFundingLedgerUpdates(_params?: {
    accountId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<RawHyperLiquidLedgerUpdate[]> {
    // Not implemented for MYX
    return [];
  }

  async getUserHistory(_params?: {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
  }): Promise<UserHistoryItem[]> {
    // Not implemented for MYX
    return [];
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const { entryPrice, leverage, direction } = params;

    // Simplified liquidation calculation
    // MYX uses maintenance margin rate from pool config
    const maintenanceMarginRate = 0.005; // 0.5% default

    if (direction === 'long') {
      const liquidationPrice =
        entryPrice * (1 - 1 / leverage + maintenanceMarginRate);
      return liquidationPrice.toFixed(2);
    }
    const liquidationPrice =
      entryPrice * (1 + 1 / leverage - maintenanceMarginRate);
    return liquidationPrice.toFixed(2);
  }

  async calculateMaintenanceMargin(
    _params: MaintenanceMarginParams,
  ): Promise<number> {
    // Default maintenance margin rate
    return 0.005; // 0.5%
  }

  async getMaxLeverage(asset: string): Promise<number> {
    try {
      // MYXPoolSymbol doesn't have maxLeverage directly
      // We need to get market details for leverage info
      const markets = await this.getMarkets();
      const market = markets.find((m) => m.name === asset);
      return market?.maxLeverage || 20; // Default max leverage
    } catch (error) {
      return 20;
    }
  }

  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    const { orderType, isMaker, amount } = params;

    const feeRate =
      orderType === 'limit' && isMaker
        ? MYX_FEE_RATES.maker
        : MYX_FEE_RATES.taker;

    const result: FeeCalculationResult = {
      feeRate,
      protocolFeeRate: feeRate,
    };

    if (amount) {
      const amountNum = parseFloat(amount);
      result.feeAmount = amountNum * feeRate;
      result.protocolFeeAmount = amountNum * feeRate;
    }

    return result;
  }

  // ============================================================================
  // Deposits & Withdrawals
  // ============================================================================

  getDepositRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    const isTestnet = this.clientService.isTestnetMode();
    const bridgeInfo = getMYXBridgeInfo(isTestnet);
    const supportedAssets = getMYXSupportedAssets(isTestnet);

    return supportedAssets.map((assetId) => ({
      assetId,
      chainId: bridgeInfo.chainId,
      contractAddress: bridgeInfo.contractAddress,
      constraints: {
        minAmount: '1', // $1 minimum
        estimatedTime: '30-60 seconds',
      },
    }));
  }

  getWithdrawalRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    return this.getDepositRoutes();
  }

  async validateDeposit(
    params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!params.amount || parseFloat(params.amount) <= 0) {
      return { isValid: false, error: 'Invalid deposit amount' };
    }
    return { isValid: true };
  }

  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!params.coin) {
      return { isValid: false, error: 'Coin is required' };
    }
    if (!params.size || parseFloat(params.size) <= 0) {
      return { isValid: false, error: 'Invalid order size' };
    }
    if (params.orderType === 'limit' && !params.price) {
      return { isValid: false, error: 'Limit price required for limit orders' };
    }
    return { isValid: true };
  }

  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!params.coin) {
      return { isValid: false, error: 'Coin is required' };
    }
    return { isValid: true };
  }

  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!params.amount || parseFloat(params.amount) <= 0) {
      return { isValid: false, error: 'Invalid withdrawal amount' };
    }
    return { isValid: true };
  }

  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    await this.ensureClientsInitialized();

    try {
      this.deps.debugLogger.log('[MYXProvider] Withdrawing', params);

      const userAddress = this.walletService.getCurrentUserAddress();

      // MYX withdrawal via SDK
      const result = await this.clientService.withdraw({
        userAddress,
        amount: toMYXCollateral(params.amount),
        destinationAddress: params.destination || userAddress,
      });

      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          estimatedArrivalTime:
            MYX_WITHDRAWAL_CONFIG.estimatedMinutes * 60 * 1000, // Convert to ms
        };
      }

      return {
        success: false,
        error: result.error || 'Withdrawal failed',
      };
    } catch (error) {
      this.deps.logger.error(
        ensureError(error),
        this.getErrorContext('withdraw'),
      );
      return {
        success: false,
        error: ensureError(error).message,
      };
    }
  }

  // ============================================================================
  // Subscriptions
  // ============================================================================

  subscribeToPrices(params: SubscribePricesParams): () => void {
    // Return synchronous unsubscribe function, handle async internally
    let cleanup: (() => void) | undefined;

    this.subscriptionService
      .subscribeToPrices(params)
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch((error) => {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('subscribeToPrices'),
        );
      });

    return () => {
      cleanup?.();
    };
  }

  subscribeToPositions(params: SubscribePositionsParams): () => void {
    let cleanup: (() => void) | undefined;

    this.subscriptionService
      .subscribeToPositions(params)
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch((error) => {
        // Debug level - subscription fallback is expected behavior
        this.deps.debugLogger.log(
          '[MYXProvider] Position subscription using REST fallback',
          { reason: ensureError(error).message },
        );
      });

    return () => {
      cleanup?.();
    };
  }

  subscribeToOrderFills(_params: SubscribeOrderFillsParams): () => void {
    // Order fills subscription not available in MYX (blocker)
    this.deps.debugLogger.log(
      '[MYXProvider] subscribeToOrderFills not yet implemented',
    );
    return () => {
      // No-op
    };
  }

  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    let cleanup: (() => void) | undefined;

    this.subscriptionService
      .subscribeToOrders(params)
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch((error) => {
        // Debug level - subscription fallback is expected behavior
        this.deps.debugLogger.log(
          '[MYXProvider] Order subscription using REST fallback',
          { reason: ensureError(error).message },
        );
      });

    return () => {
      cleanup?.();
    };
  }

  subscribeToAccount(params: SubscribeAccountParams): () => void {
    let cleanup: (() => void) | undefined;

    this.subscriptionService
      .subscribeToAccount(params)
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch((error) => {
        // Debug level - subscription fallback is expected behavior
        this.deps.debugLogger.log(
          '[MYXProvider] Account subscription using REST fallback',
          { reason: ensureError(error).message },
        );
      });

    return () => {
      cleanup?.();
    };
  }

  subscribeToOICaps(_params: SubscribeOICapsParams): () => void {
    // OI caps not available in MYX
    this.deps.debugLogger.log(
      '[MYXProvider] subscribeToOICaps not implemented for MYX',
    );
    return () => {
      // No-op
    };
  }

  subscribeToCandles(params: SubscribeCandlesParams): () => void {
    let cleanup: (() => void) | undefined;

    // Map interval to MYX resolution
    const resolutionMap: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
      '1w': '1w',
      '1M': '1M',
    };

    const resolution = resolutionMap[params.interval] || '1h';

    this.subscriptionService
      .subscribeToKline(
        params.coin,
        resolution as MYXKlineResolution,
        (data) => {
          // Convert MYX kline to CandleData format
          // CandleData expects { coin, interval, candles[] }
          params.callback({
            coin: params.coin,
            interval: params.interval,
            candles: [
              {
                time: data.data.t,
                open: data.data.o,
                high: data.data.h,
                low: data.data.l,
                close: data.data.c,
                volume: data.data.v,
              },
            ],
          });
        },
      )
      .then((unsubscribe) => {
        cleanup = unsubscribe;
      })
      .catch((error) => {
        this.deps.logger.error(
          ensureError(error),
          this.getErrorContext('subscribeToCandles'),
        );
        params.onError?.(ensureError(error));
      });

    return () => {
      cleanup?.();
    };
  }

  subscribeToOrderBook(_params: SubscribeOrderBookParams): () => void {
    // Order book subscription not available in MYX (blocker)
    this.deps.debugLogger.log(
      '[MYXProvider] subscribeToOrderBook not yet implemented',
    );
    return () => {
      // No-op
    };
  }

  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    // Configuration for live data (throttling, etc.)
    this.deps.debugLogger.log('[MYXProvider] setLiveDataConfig', config);
  }

  // ============================================================================
  // Utilities
  // ============================================================================

  getBlockExplorerUrl(address?: string): string {
    const isTestnet = this.clientService.isTestnetMode();
    const baseUrl = isTestnet
      ? 'https://sepolia.arbiscan.io'
      : 'https://bscscan.com';

    if (address) {
      return `${baseUrl}/address/${address}`;
    }
    return baseUrl;
  }

  setUserFeeDiscount(discountBips: number | undefined): void {
    // MYX may support fee discounts via VIP tiers
    this.deps.debugLogger.log('[MYXProvider] setUserFeeDiscount', {
      discountBips,
    });
  }
}
