/**
 * MYXProvider
 *
 * Provider implementation for MYX protocol.
 * Implements the PerpsProvider interface with read-only and authenticated read operations.
 * Trading write operations will be added in Phase 2.
 *
 * Key differences from HyperLiquid:
 * - Uses USDT collateral on BNB chain (vs USDC on Arbitrum)
 * - Multi-Pool Model: multiple pools can exist per symbol
 * - Uses REST polling for prices (WebSocket deferred to Phase 4)
 */

import type { CaipAccountId } from '@metamask/utils';
import type { KlineResolution, PlaceOrderParams } from '@myx-trade/sdk';

import { calculateCandleCount } from '../constants/chartConfig';
import {
  MYX_MAX_LEVERAGE,
  MYX_FEE_RATE,
  MYX_PROTOCOL_FEE_RATE,
  MYX_ACCOUNT_CONTRACTS,
  MYX_COLLATERAL_ASSET_IDS,
  MYX_DEFAULT_SLIPPAGE_BPS,
  MYX_EXECUTION_FEE_TOKEN,
  MYX_MIN_ORDER_SIZE_BUFFER,
  MYX_MINIMUM_ORDER_SIZE_USD,
  MYX_PRICE_POLLING_INTERVAL_MS,
  toMYXSize,
  toMYXCollateral,
  toMYXContractPrice,
} from '../constants/myxConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsControllerMessenger } from '../PerpsController';
import { PERPS_ERROR_CODES } from '../perpsErrorCodes';
import { MYXClientService } from '../services/MYXClientService';
import { MYXWalletService } from '../services/MYXWalletService';
import { WebSocketConnectionState } from '../types';
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
  GetHistoricalPortfolioParams,
  GetMarketsParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetOrFetchFillsParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  HistoricalPortfolioResult,
  InitializeResult,
  LiquidationPriceParams,
  LiveDataConfig,
  MaintenanceMarginParams,
  MarginResult,
  MarketInfo,
  Order,
  OrderFill,
  OrderParams,
  OrderResult,
  PerpsPlatformDependencies,
  PerpsMarketData,
  PerpsProvider,
  Position,
  PriceUpdate,
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
  UpdateMarginParams,
  UpdatePositionTPSLParams,
  UserHistoryItem,
  WithdrawParams,
  WithdrawResult,
  RawLedgerUpdate,
} from '../types';
import type {
  MYXAuthConfig,
  MYXKlineDataResponse,
  MYXNetwork,
  MYXPoolSymbol,
  MYXTicker,
} from '../types/myx-types';
import { MYXOrderStatusEnum } from '../types/myx-types';
import type { CandleData } from '../types/perps-types';
import { ensureError } from '../utils/errorUtils';
import {
  getMaxOrderValue,
  validateOrderParams,
} from '../utils/hyperLiquidValidation';
import {
  adaptMarketFromMYX,
  adaptMarketDataFromMYX,
  adaptPriceFromMYX,
  adaptPositionFromMYX,
  adaptOrderFromMYX,
  adaptOrderFillFromMYX,
  adaptAccountStateFromMYX,
  adaptCandleFromMYX,
  adaptCandleFromMYXWebSocket,
  adaptFundingFromMYX,
  adaptUserHistoryFromMYX,
  filterMYXExclusiveMarkets,
  buildPoolSymbolMap,
  toMYXKlineResolution,
} from '../utils/myxAdapter';

// ============================================================================
// Constants
// ============================================================================

const MYX_NOT_SUPPORTED_ERROR = 'MYX trading not yet supported';
const MYX_BLOCK_EXPLORER_URL = 'https://bscscan.com';
const MYX_TESTNET_EXPLORER_URL = 'https://sepolia.arbiscan.io';

// ============================================================================
// MYXProvider
// ============================================================================

/**
 * MYX provider implementation
 *
 * Authenticated read operations for positions, orders, account state.
 * Trading write operations return errors until Phase 2.
 */
export class MYXProvider implements PerpsProvider {
  readonly protocolId = 'myx';

  // Platform dependencies
  readonly #deps: PerpsPlatformDependencies;

  // Client service
  readonly #clientService: MYXClientService;

  // Wallet service (requires messenger for signing)
  #walletService: MYXWalletService | null = null;

  // Messenger for wallet operations
  readonly #messenger: PerpsControllerMessenger | null;

  // Configuration
  readonly #isTestnet: boolean;

  // Cache for pools (freshness delegated to MYXClientService)
  #poolsCache: MYXPoolSymbol[] = [];

  #poolSymbolMap: Map<string, string> = new Map();

  // Ticker cache for price data
  readonly #tickersCache: Map<string, MYXTicker> = new Map();

  // Auth dedup promise
  #authPromise: Promise<void> | null = null;

  constructor(options: {
    isTestnet?: boolean;
    platformDependencies: PerpsPlatformDependencies;
    messenger?: PerpsControllerMessenger;
    myxAuthConfig?: MYXAuthConfig;
  }) {
    this.#deps = options.platformDependencies;
    this.#isTestnet = options.isTestnet ?? true;
    this.#messenger = options.messenger ?? null;

    // Initialize client service with auth config
    this.#clientService = new MYXClientService(this.#deps, {
      isTestnet: this.#isTestnet,
      authConfig: options.myxAuthConfig,
    });

    this.#deps.debugLogger.log('[MYXProvider] Constructor complete', {
      protocolId: this.protocolId,
      isTestnet: this.#isTestnet,
      hasMessenger: Boolean(this.#messenger),
    });
  }

  // ============================================================================
  // Error Context Helper
  // ============================================================================

  #getErrorContext(
    method: string,
    extra?: Record<string, unknown>,
  ): {
    tags?: Record<string, string | number>;
    context?: { name: string; data: Record<string, unknown> };
  } {
    return {
      tags: {
        feature: PERPS_CONSTANTS.FeatureName,
        provider: 'MYXProvider',
        network: this.#isTestnet ? 'testnet' : 'mainnet',
      },
      context: {
        name: `MYXProvider.${method}`,
        data: {
          isTestnet: this.#isTestnet,
          ...extra,
        },
      },
    };
  }

  // ============================================================================
  // Initialization & Lifecycle
  // ============================================================================

  async initialize(): Promise<InitializeResult> {
    try {
      this.#deps.debugLogger.log('[MYXProvider] Initializing...');

      // Fetch initial markets
      const pools = await this.#clientService.getMarkets();

      // Filter to MYX-exclusive markets
      this.#poolsCache = filterMYXExclusiveMarkets(pools);
      this.#poolSymbolMap = buildPoolSymbolMap(this.#poolsCache);

      this.#deps.debugLogger.log('[MYXProvider] Initialized successfully', {
        totalPools: pools.length,
        exclusivePools: this.#poolsCache.length,
      });

      return { success: true };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.initialize');
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('initialize'),
      );
      return { success: false, error: wrappedError.message };
    }
  }

  async disconnect(): Promise<DisconnectResult> {
    try {
      this.#deps.debugLogger.log('[MYXProvider] Disconnecting...');

      this.#clientService.disconnect();
      this.#poolsCache = [];
      this.#poolSymbolMap.clear();
      this.#tickersCache.clear();

      return { success: true };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.disconnect');
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('disconnect'),
      );
      return { success: false, error: wrappedError.message };
    }
  }

  async ping(timeoutMs?: number): Promise<void> {
    await this.#clientService.ping(timeoutMs);
  }

  async toggleTestnet(): Promise<ToggleTestnetResult> {
    // Stage 1: Testnet only
    return {
      success: false,
      isTestnet: this.#isTestnet,
      error: 'MYX mainnet not yet available',
    };
  }

  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    if (!this.#messenger) {
      return {
        ready: false,
        error: 'MYX provider requires messenger for wallet operations',
        walletConnected: false,
        networkSupported: true,
      };
    }

    try {
      await this.#ensureAuthenticated();
      return {
        ready: true,
        walletConnected: true,
        networkSupported: true,
        authenticatedAddress:
          this.#clientService.getAuthenticatedAddress() ?? undefined,
      };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.isReadyToTrade',
      );
      return {
        ready: false,
        error: wrappedError.message,
        walletConnected: false,
        networkSupported: true,
      };
    }
  }

  /**
   * Ensure the MYX client is authenticated.
   * Lazy auth: creates signer + walletClient on first call, then calls clientService.authenticate().
   * Uses promise dedup to prevent concurrent auth attempts.
   */
  async #ensureAuthenticated(): Promise<void> {
    // Always resolve the current address first so we can check per-address auth
    const currentAddress = this.#getCurrentAddress();

    if (this.#clientService.isAuthenticatedForAddress(currentAddress)) {
      return;
    }

    if (this.#authPromise) {
      await this.#authPromise;
      // Re-check: the in-flight auth may have been for a different address
      if (this.#clientService.isAuthenticatedForAddress(currentAddress)) {
        return;
      }
      // Otherwise fall through to start a new auth for the current address
    }

    this.#authPromise = this.#doEnsureAuthenticated();
    try {
      await this.#authPromise;
    } finally {
      this.#authPromise = null;
    }
  }

  /**
   * Get the current user address, creating the wallet service if needed.
   *
   * @returns The current user wallet address.
   */
  #getCurrentAddress(): string {
    if (!this.#messenger) {
      throw new Error(
        'MYX provider requires messenger for authenticated operations',
      );
    }

    if (!this.#walletService) {
      this.#walletService = new MYXWalletService(this.#deps, this.#messenger, {
        isTestnet: this.#isTestnet,
      });
    }

    return this.#walletService.getUserAddress();
  }

  async #doEnsureAuthenticated(): Promise<void> {
    if (!this.#messenger) {
      throw new Error(
        'MYX provider requires messenger for authenticated operations',
      );
    }

    // Create wallet service if not yet created
    if (!this.#walletService) {
      this.#walletService = new MYXWalletService(this.#deps, this.#messenger, {
        isTestnet: this.#isTestnet,
      });
    }

    const signer = this.#walletService.createEthersSigner();
    const walletClient = this.#walletService.createWalletClient();
    const address = this.#walletService.getUserAddress();

    await this.#clientService.authenticate(signer, walletClient, address);
  }

  /**
   * Get the wallet service, throwing if not initialized.
   * Call #ensureAuthenticated() before calling this.
   *
   * @returns The initialized MYXWalletService instance.
   */
  #getWalletService(): MYXWalletService {
    if (!this.#walletService) {
      throw new Error('MYX wallet service not initialized');
    }
    return this.#walletService;
  }

  // ============================================================================
  // Market Data Operations (Stage 1 - Fully Implemented)
  // ============================================================================

  async getMarkets(_params?: GetMarketsParams): Promise<MarketInfo[]> {
    try {
      // Delegate cache freshness to MYXClientService
      const pools = await this.#clientService.getMarkets();
      this.#poolsCache = filterMYXExclusiveMarkets(pools);
      this.#poolSymbolMap = buildPoolSymbolMap(this.#poolsCache);

      // Fetch per-pool minimum order sizes in parallel
      const poolMinSizes = await Promise.all(
        this.#poolsCache.map(async (pool) => {
          try {
            const config = await this.#clientService.getPoolLevelConfig(
              pool.poolId,
            );
            return config.minOrderSizeInUsd > 0
              ? config.minOrderSizeInUsd
              : undefined;
          } catch {
            return undefined; // Fall back to static constant in adapter
          }
        }),
      );

      return this.#poolsCache.map((pool, i) =>
        adaptMarketFromMYX(pool, poolMinSizes[i]),
      );
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.getMarkets');
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getMarkets'),
      );
      return [];
    }
  }

  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    try {
      // Ensure we have markets
      if (this.#poolsCache.length === 0) {
        await this.getMarkets();
      }

      // Fetch tickers for all pools
      const poolIds = this.#poolsCache.map((pool) => pool.poolId);
      const tickers = await this.#clientService.getTickers(poolIds);

      // Build ticker map
      const tickerMap = new Map<string, MYXTicker>();
      for (const ticker of tickers) {
        tickerMap.set(ticker.poolId, ticker);
        this.#tickersCache.set(ticker.poolId, ticker);
      }

      // Transform to PerpsMarketData, only include pools with ticker data
      return this.#poolsCache
        .filter((pool) => tickerMap.has(pool.poolId))
        .map((pool) =>
          adaptMarketDataFromMYX(
            pool,
            tickerMap.get(pool.poolId),
            this.#deps.marketDataFormatters,
          ),
        );
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.getMarketDataWithPrices',
      );
      this.#deps.debugLogger.log(
        '[MYXProvider] getMarketDataWithPrices failed',
        {
          error: String(wrappedError),
          ...this.#getErrorContext('getMarketDataWithPrices'),
        },
      );
      return [];
    }
  }

  // ============================================================================
  // Price Subscriptions (Stage 1 - REST Polling)
  // ============================================================================

  subscribeToPrices(params: SubscribePricesParams): () => void {
    const { symbols, callback, includeOrderBook } = params;

    this.#deps.debugLogger.log('[MYXProvider] Setting up price subscription', {
      symbols: symbols.length,
      includeOrderBook,
    });

    // Map symbols to pool IDs
    const poolIds: string[] = [];
    for (const pool of this.#poolsCache) {
      const symbol = pool.baseSymbol || pool.poolId;
      if (symbols.includes(symbol)) {
        poolIds.push(pool.poolId);
      }
    }

    if (poolIds.length === 0) {
      this.#deps.debugLogger.log(
        '[MYXProvider] subscribeToPrices: No pool IDs found. Ensure initialize() has been called.',
        { symbols },
      );
      setTimeout(() => params.callback([]), 0);
      return () => {
        /* noop */
      };
    }

    // Start price polling
    this.#clientService.startPricePolling(poolIds, (tickers) => {
      // Convert tickers to PriceUpdate format
      const updates: PriceUpdate[] = tickers.map((ticker) => {
        const symbol = this.#poolSymbolMap.get(ticker.poolId) ?? ticker.poolId;
        const { price, change24h } = this.#getAdaptedPrice(ticker);

        return {
          symbol,
          price,
          timestamp: Date.now(),
          percentChange24h: change24h.toFixed(2),
          providerId: 'myx',
        };
      });

      callback(updates);
    });

    // Return unsubscribe function
    return () => {
      this.#deps.debugLogger.log('[MYXProvider] Unsubscribing from prices');
      this.#clientService.stopPricePolling();
    };
  }

  #getAdaptedPrice(ticker: MYXTicker): {
    price: string;
    change24h: number;
  } {
    return adaptPriceFromMYX(ticker);
  }

  // ============================================================================
  // Asset Routes (Stage 1 - Stubbed)
  // ============================================================================

  getDepositRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    const network: MYXNetwork = this.#isTestnet ? 'testnet' : 'mainnet';
    const accountInfo = MYX_ACCOUNT_CONTRACTS[network];

    return [
      {
        assetId: MYX_COLLATERAL_ASSET_IDS[network],
        chainId: accountInfo.chainId,
        contractAddress: accountInfo.contractAddress,
      },
    ];
  }

  getWithdrawalRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    // Stage 1: No withdrawal support
    return [];
  }

  // ============================================================================
  // Trading Operations (Stage 1 - All Stubbed)
  // ============================================================================

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    try {
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] START', {
        symbol: params.symbol,
        isBuy: params.isBuy,
        size: params.size,
        orderType: params.orderType,
        usdAmount: params.usdAmount,
        leverage: params.leverage,
      });

      await this.#ensureAuthenticated();
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] Auth OK');

      const walletService = this.#getWalletService();
      const address = walletService.getUserAddress();
      const chainId = this.#clientService.getChainId();
      const network = this.#clientService.getNetwork();
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] Wallet', {
        address,
        chainId,
        network,
      });

      // Resolve symbol → poolId (poolSymbolMap is poolId→symbol, so reverse lookup)
      let poolId: string | undefined;
      for (const [pid, sym] of this.#poolSymbolMap) {
        if (sym === params.symbol) {
          poolId = pid;
          break;
        }
      }
      if (!poolId) {
        this.#deps.debugLogger.log('[MYXProvider.placeOrder] Unknown symbol', {
          symbol: params.symbol,
          available: [...this.#poolSymbolMap.values()],
        });
        return {
          success: false,
          error: `Unknown symbol: ${params.symbol}. Available: ${[...this.#poolSymbolMap.values()].join(', ')}`,
        };
      }
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] Pool resolved', {
        poolId,
      });

      // Get marketId (required for createIncreaseOrder)
      const marketDetail = await this.#clientService.getMarketDetail(poolId);
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] Market detail', {
        marketId: marketDetail.marketId,
        baseSymbol: marketDetail.baseSymbol,
      });

      // Get trading fee rate
      this.#deps.debugLogger.log(
        '[MYXProvider.placeOrder] Fetching fee rate...',
      );
      const feeRates = await this.#clientService.getUserTradingFeeRate(
        0,
        0,
        chainId,
      );
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] Fee rates', {
        takerFeeRate: feeRates.takerFeeRate,
        makerFeeRate: feeRates.makerFeeRate,
      });

      // Compute collateral in the token's native decimals (USDT=18, USDC=6)
      const usdAmount = params.usdAmount
        ? parseFloat(params.usdAmount)
        : parseFloat(params.size) *
          (params.currentPrice ?? parseFloat(params.price ?? '0'));

      // Validate minimum order size — fetch per-pool config, fall back to static constant.
      // Add 10% buffer for price movement between validation and on-chain execution.
      let minOrderSize = MYX_MINIMUM_ORDER_SIZE_USD;
      try {
        const poolConfig = await this.#clientService.getPoolLevelConfig(poolId);
        if (poolConfig.minOrderSizeInUsd > 0) {
          minOrderSize = poolConfig.minOrderSizeInUsd;
        }
      } catch {
        // Non-fatal: use static fallback
      }
      const minOrderSizeWithBuffer = minOrderSize * MYX_MIN_ORDER_SIZE_BUFFER;
      if (usdAmount < minOrderSizeWithBuffer) {
        return {
          success: false,
          error: `Order size $${usdAmount.toFixed(2)} is below minimum $${Math.ceil(minOrderSizeWithBuffer)}`,
        };
      }

      const collateralAmount = toMYXCollateral(usdAmount, network);

      // Compute trading fee: collateral * takerFeeRate / 1e6
      const takerFeeRate = BigInt(feeRates.takerFeeRate || '1000');
      const tradingFee = (
        (BigInt(collateralAmount) * takerFeeRate) /
        BigInt(1e6)
      ).toString();

      // Determine price in 30-decimal format.
      // For market orders without an explicit price, fetch current market price
      // and apply 5% buffer: LONG → high accepted price, SHORT → low.
      let orderPrice = params.price ?? String(params.currentPrice ?? 0);
      if (orderPrice === '0' || orderPrice === '') {
        const tickers = await this.#clientService.getTickers([poolId]);
        const tickerPriceNum = parseFloat(tickers[0]?.price ?? '0');
        if (!tickerPriceNum || isNaN(tickerPriceNum)) {
          return {
            success: false,
            error: 'Could not fetch current market price',
          };
        }
        const slippageMultiplier = params.isBuy ? 1.05 : 0.95;
        orderPrice = String(tickerPriceNum * slippageMultiplier);
      }
      const price30Dec = toMYXContractPrice(orderPrice);

      // Map direction: isBuy → LONG (0), !isBuy → SHORT (1)
      const direction = params.isBuy ? 0 : 1;

      // Map order type: 'market' → 0, 'limit' → 1
      const sdkOrderType = params.orderType === 'limit' ? 1 : 0;

      // Build SDK PlaceOrderParams
      const sdkParams: PlaceOrderParams = {
        chainId,
        address: address as `0x${string}`,
        poolId,
        positionId: '', // Falsy → SDK uses placeOrderWithSalt for new positions
        orderType: sdkOrderType,
        triggerType: 0, // TriggerType.NONE
        direction,
        collateralAmount,
        size: toMYXSize(parseFloat(params.size)),
        price: price30Dec,
        timeInForce: 0, // TimeInForce.IOC
        postOnly: false,
        slippagePct: String(params.maxSlippageBps ?? MYX_DEFAULT_SLIPPAGE_BPS),
        executionFeeToken: MYX_EXECUTION_FEE_TOKEN[network],
        leverage: params.leverage ?? 1,
        tpSize: '0',
        tpPrice: params.takeProfitPrice
          ? toMYXContractPrice(params.takeProfitPrice)
          : '0',
        slSize: '0',
        slPrice: params.stopLossPrice
          ? toMYXContractPrice(params.stopLossPrice)
          : '0',
      };

      this.#deps.debugLogger.log('[MYXProvider.placeOrder] SDK params', {
        symbol: params.symbol,
        poolId,
        marketId: marketDetail.marketId,
        direction: params.isBuy ? 'LONG' : 'SHORT',
        orderType: params.orderType,
        collateralAmount,
        size: sdkParams.size,
        price: price30Dec,
        leverage: sdkParams.leverage,
        tradingFee,
      });

      this.#deps.debugLogger.log(
        '[MYXProvider.placeOrder] Calling createIncreaseOrder...',
      );
      const result = await this.#clientService.createIncreaseOrder(
        sdkParams,
        tradingFee,
        marketDetail.marketId,
      );
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] SDK result', {
        code: result.code,
        message: result.message,
        data: result.data,
      });

      if (result.code !== 0) {
        return {
          success: false,
          error:
            `MYX order failed: code=${result.code} ${result.message ?? ''}`.trim(),
        };
      }

      // Extract transaction hash if available
      const data = result.data as
        | { transactionHash?: string; orderId?: string }
        | undefined;

      this.#deps.debugLogger.log('[MYXProvider.placeOrder] SUCCESS', {
        orderId: data?.transactionHash ?? data?.orderId,
      });

      return {
        success: true,
        orderId: data?.transactionHash ?? data?.orderId,
        providerId: 'myx',
      };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.placeOrder');
      this.#deps.debugLogger.log('[MYXProvider.placeOrder] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('placeOrder', { symbol: params.symbol }),
      );
      return {
        success: false,
        error: wrappedError.message,
      };
    }
  }

  async editOrder(_params: EditOrderParams): Promise<OrderResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
  }

  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    try {
      await this.#ensureAuthenticated();
      const chainId = this.#clientService.getChainId();

      this.#deps.debugLogger.log('[MYXProvider.cancelOrder] START', {
        orderId: params.orderId,
        symbol: params.symbol,
      });

      const result = await this.#clientService.cancelOrder(
        params.orderId,
        chainId,
      );

      if (result.code !== 0) {
        return {
          success: false,
          error:
            `MYX cancel failed: code=${result.code} ${result.message ?? ''}`.trim(),
        };
      }

      return {
        success: true,
        orderId: params.orderId,
        providerId: 'myx',
      };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.cancelOrder');
      this.#deps.debugLogger.log('[MYXProvider.cancelOrder] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('cancelOrder', { orderId: params.orderId }),
      );
      return {
        success: false,
        error: wrappedError.message,
      };
    }
  }

  async cancelOrders(
    _params: BatchCancelOrdersParams,
  ): Promise<CancelOrdersResult> {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      results: [],
    };
  }

  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    try {
      this.#deps.debugLogger.log('[MYXProvider.closePosition] START', {
        symbol: params.symbol,
        size: params.size,
        orderType: params.orderType,
      });

      await this.#ensureAuthenticated();
      const walletService = this.#getWalletService();
      const address = walletService.getUserAddress();
      const chainId = this.#clientService.getChainId();
      const network = this.#clientService.getNetwork();

      // Resolve symbol → poolId
      let poolId: string | undefined;
      for (const [pid, sym] of this.#poolSymbolMap) {
        if (sym === params.symbol) {
          poolId = pid;
          break;
        }
      }
      if (!poolId) {
        return {
          success: false,
          error: `No MYX pool found for symbol "${params.symbol}"`,
        };
      }

      // Find the position to close — use raw SDK data for positionId + direction
      const posResult = await this.#clientService.listPositions(address);
      const rawPositions = (posResult.data ?? []).filter(
        (pos) => pos.size && pos.size !== '0' && pos.poolId === poolId,
      );

      if (rawPositions.length === 0) {
        return {
          success: false,
          error: `No open position found for ${params.symbol}`,
        };
      }

      const rawPos = rawPositions[0];

      // Determine close size — use params.size if partial, otherwise full position size
      const closeSize = params.size
        ? parseFloat(params.size)
        : parseFloat(rawPos.size);

      if (!closeSize || isNaN(closeSize)) {
        return {
          success: false,
          error: 'Invalid close size',
        };
      }

      // Determine close price
      let closePrice: number;
      if (params.price) {
        closePrice = parseFloat(params.price);
      } else if (params.currentPrice) {
        // Apply slippage: closing LONG sells (accept lower), closing SHORT buys (accept higher)
        const slippage = rawPos.direction === 0 ? 0.95 : 1.05;
        closePrice = params.currentPrice * slippage;
      } else {
        // Fetch market price
        const tickers = await this.#clientService.getTickers([poolId]);
        const tickerPrice = parseFloat(tickers[0]?.price ?? '0');
        if (!tickerPrice || isNaN(tickerPrice)) {
          return {
            success: false,
            error: 'Could not fetch current market price for close',
          };
        }
        const slippage = rawPos.direction === 0 ? 0.95 : 1.05;
        closePrice = tickerPrice * slippage;
      }

      // SDK expects 30-decimal price and 18-decimal size
      const sdkOrderType = params.orderType === 'limit' ? 1 : 0;

      // Access userLeverage from raw position — SDK type doesn't declare it but API returns it
      const userLeverage =
        (rawPos as unknown as { userLeverage?: number }).userLeverage ?? 1;

      const sdkParams: PlaceOrderParams = {
        chainId,
        address: address as `0x${string}`,
        poolId,
        positionId: rawPos.positionId,
        orderType: sdkOrderType,
        triggerType: 0,
        direction: rawPos.direction,
        collateralAmount: '0',
        size: toMYXSize(closeSize),
        price: toMYXContractPrice(closePrice),
        timeInForce: 0,
        postOnly: false,
        slippagePct: String(params.maxSlippageBps ?? MYX_DEFAULT_SLIPPAGE_BPS),
        executionFeeToken: MYX_EXECUTION_FEE_TOKEN[network],
        leverage: userLeverage,
        tpSize: '0',
        tpPrice: '0',
        slSize: '0',
        slPrice: '0',
      };

      this.#deps.debugLogger.log('[MYXProvider.closePosition] SDK params', {
        symbol: params.symbol,
        poolId,
        positionId: rawPos.positionId,
        direction: rawPos.direction === 0 ? 'LONG' : 'SHORT',
        closeSize,
        closePrice,
        leverage: userLeverage,
      });

      const result = await this.#clientService.createDecreaseOrder(sdkParams);

      this.#deps.debugLogger.log('[MYXProvider.closePosition] SDK result', {
        code: result.code,
        message: result.message,
      });

      if (result.code !== 0) {
        return {
          success: false,
          error:
            `MYX close failed: code=${result.code} ${result.message ?? ''}`.trim(),
        };
      }

      const data = result.data as
        | { transactionHash?: string; orderId?: string }
        | undefined;

      return {
        success: true,
        orderId: data?.transactionHash ?? data?.orderId,
        providerId: 'myx',
      };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.closePosition',
      );
      this.#deps.debugLogger.log('[MYXProvider.closePosition] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('closePosition', { symbol: params.symbol }),
      );
      return {
        success: false,
        error: wrappedError.message,
      };
    }
  }

  async closePositions(
    _params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      results: [],
    };
  }

  async updatePositionTPSL(
    _params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
  }

  async updateMargin(_params: UpdateMarginParams): Promise<MarginResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
  }

  async withdraw(_params: WithdrawParams): Promise<WithdrawResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
  }

  // ============================================================================
  // Account Operations (Authenticated Reads)
  // ============================================================================

  async getPositions(_params?: GetPositionsParams): Promise<Position[]> {
    try {
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();
      const result = await this.#clientService.listPositions(address);

      if (!result.data || !Array.isArray(result.data)) {
        return [];
      }

      const activePositions = result.data.filter(
        (pos) => pos.size && pos.size !== '0',
      );

      if (activePositions.length === 0) {
        return [];
      }

      // Fetch tickers for mark prices (PnL + liquidation calculation)
      const posPoolIds = [...new Set(activePositions.map((pos) => pos.poolId))];
      const tickerPriceMap = new Map<string, number>();
      try {
        const tickers = await this.#clientService.getTickers(posPoolIds);
        for (const ticker of tickers) {
          const price = parseFloat(ticker.price);
          if (!isNaN(price) && price > 0) {
            tickerPriceMap.set(ticker.poolId, price);
          }
        }
      } catch {
        // Non-fatal: positions still returned without PnL
      }

      return activePositions.map((pos) =>
        adaptPositionFromMYX(
          pos,
          this.#poolSymbolMap,
          tickerPriceMap.get(pos.poolId),
        ),
      );
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.getPositions');
      this.#deps.debugLogger.log('[MYXProvider] getPositions failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getPositions'),
      });
      return [];
    }
  }

  async getAccountState(
    _params?: GetAccountStateParams,
  ): Promise<AccountState> {
    try {
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();
      const chainId = this.#clientService.getChainId();

      // Get account info — try pools until one returns valid data.
      // Account balances (freeAmount, walletBalance) are global across pools,
      // but the on-chain call fails with 0x for pools the user hasn't interacted with.
      let accountData: unknown;
      for (const pool of this.#poolsCache) {
        try {
          const infoResult = await this.#clientService.getAccountInfo(
            chainId,
            address,
            pool.poolId,
          );
          if (infoResult.data !== undefined) {
            accountData = infoResult.data;
            break;
          }
        } catch {
          // Try next pool
        }
      }

      return adaptAccountStateFromMYX(
        accountData,
        this.#clientService.getNetwork(),
      );
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.getAccountState',
      );
      this.#deps.debugLogger.log('[MYXProvider] getAccountState failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getAccountState'),
      });
      return {
        availableBalance: '0',
        totalBalance: '0',
        marginUsed: '0',
        unrealizedPnl: '0',
        returnOnEquity: '0',
      };
    }
  }

  async getOrders(_params?: GetOrdersParams): Promise<Order[]> {
    try {
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();
      const result = await this.#clientService.getOrderHistory(
        { limit: 50 },
        address,
      );

      if (!result.data || !Array.isArray(result.data)) {
        return [];
      }

      return result.data.map((order) =>
        adaptOrderFromMYX(order, this.#poolSymbolMap),
      );
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.getOrders');
      this.#deps.debugLogger.log('[MYXProvider] getOrders failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getOrders'),
      });
      return [];
    }
  }

  async getOpenOrders(_params?: GetOrdersParams): Promise<Order[]> {
    try {
      const allOrders = await this.getOrders();
      return allOrders.filter((order) => order.status === 'open');
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.getOpenOrders',
      );
      this.#deps.debugLogger.log('[MYXProvider] getOpenOrders failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getOpenOrders'),
      });
      return [];
    }
  }

  async getOrderFills(_params?: GetOrderFillsParams): Promise<OrderFill[]> {
    try {
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();
      const result = await this.#clientService.getOrderHistory(
        { limit: 50 },
        address,
      );

      if (!result.data || !Array.isArray(result.data)) {
        return [];
      }

      // Only return filled orders
      return result.data
        .filter((order) => order.orderStatus === MYXOrderStatusEnum.Successful)
        .map((order) => adaptOrderFillFromMYX(order, this.#poolSymbolMap));
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.getOrderFills',
      );
      this.#deps.debugLogger.log('[MYXProvider] getOrderFills failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getOrderFills'),
      });
      return [];
    }
  }

  async getOrFetchFills(_params?: GetOrFetchFillsParams): Promise<OrderFill[]> {
    // No WS cache for MYX yet - always fetch via REST
    return this.getOrderFills(_params);
  }

  async getFunding(_params?: GetFundingParams): Promise<Funding[]> {
    try {
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();
      const result = await this.#clientService.getTradeFlow(
        { limit: 50 },
        address,
      );

      if (!result.data || !Array.isArray(result.data)) {
        return [];
      }

      return adaptFundingFromMYX(result.data, this.#poolSymbolMap);
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.getFunding');
      this.#deps.debugLogger.log('[MYXProvider] getFunding failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getFunding'),
      });
      return [];
    }
  }

  async getHistoricalPortfolio(
    _params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    return {
      accountValue1dAgo: '0',
      timestamp: Date.now(),
    };
  }

  async getUserNonFundingLedgerUpdates(_params?: {
    accountId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<RawLedgerUpdate[]> {
    return [];
  }

  async getUserHistory(_params?: {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
  }): Promise<UserHistoryItem[]> {
    try {
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();
      const result = await this.#clientService.getTradeFlow(
        { limit: 50 },
        address,
      );

      if (!result.data || !Array.isArray(result.data)) {
        return [];
      }

      return adaptUserHistoryFromMYX(result.data);
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.getUserHistory',
      );
      this.#deps.debugLogger.log('[MYXProvider] getUserHistory failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getUserHistory'),
      });
      return [];
    }
  }

  // ============================================================================
  // Validation Operations (Stage 1 - All Invalid)
  // ============================================================================

  async validateDeposit(
    _params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: true };
  }

  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string; minimumRequired?: number }> {
    try {
      const basicValidation = validateOrderParams({
        coin: params.symbol,
        size: params.size,
        price: params.price,
        orderType: params.orderType,
      });
      if (!basicValidation.isValid) {
        return basicValidation;
      }

      // Fetch per-pool minimum order size, fall back to static constant
      let minimumOrderSize = MYX_MINIMUM_ORDER_SIZE_USD;
      try {
        let poolId: string | undefined;
        for (const [pid, sym] of this.#poolSymbolMap) {
          if (sym === params.symbol) {
            poolId = pid;
            break;
          }
        }
        if (poolId) {
          const poolConfig =
            await this.#clientService.getPoolLevelConfig(poolId);
          if (poolConfig.minOrderSizeInUsd > 0) {
            minimumOrderSize = poolConfig.minOrderSizeInUsd;
          }
        }
      } catch {
        // Non-fatal: use static fallback
      }

      if (params.reduceOnly && params.isFullClose) {
        this.#deps.debugLogger.log(
          '[MYXProvider] Full close: skipping minimum check',
        );
      } else {
        let orderValueUSD: number;

        if (params.usdAmount) {
          orderValueUSD = parseFloat(params.usdAmount);
        } else {
          const size = parseFloat(params.size || '0');
          let priceForValidation = params.currentPrice;

          if (
            !priceForValidation &&
            params.price &&
            params.orderType === 'limit'
          ) {
            priceForValidation = parseFloat(params.price);
          }

          if (!priceForValidation) {
            return {
              isValid: false,
              error: PERPS_ERROR_CODES.ORDER_PRICE_REQUIRED,
            };
          }

          orderValueUSD = size * priceForValidation;
        }

        const minimumWithBuffer = minimumOrderSize * MYX_MIN_ORDER_SIZE_BUFFER;
        if (orderValueUSD < minimumWithBuffer) {
          return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_SIZE_MIN,
            minimumRequired: Math.ceil(minimumWithBuffer),
          };
        }
      }

      if (params.leverage && params.symbol) {
        const maxLeverage = await this.getMaxLeverage(params.symbol);
        if (params.leverage < 1 || params.leverage > maxLeverage) {
          return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_LEVERAGE_INVALID,
          };
        }
      }

      if (
        params.leverage &&
        params.existingPositionLeverage &&
        params.leverage < params.existingPositionLeverage
      ) {
        return {
          isValid: false,
          error: PERPS_ERROR_CODES.ORDER_LEVERAGE_BELOW_POSITION,
        };
      }

      if (params.currentPrice && params.leverage) {
        const maxLeverage = await this.getMaxLeverage(params.symbol);
        const maxOrderValue = getMaxOrderValue(maxLeverage, params.orderType);
        const orderValue = parseFloat(params.size) * params.currentPrice;

        if (orderValue > maxOrderValue) {
          return {
            isValid: false,
            error: PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED,
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    try {
      if (!params.symbol) {
        return { isValid: false, error: PERPS_ERROR_CODES.ORDER_COIN_REQUIRED };
      }

      if (params.orderType === 'limit' && !params.price) {
        return {
          isValid: false,
          error: PERPS_ERROR_CODES.ORDER_LIMIT_PRICE_REQUIRED,
        };
      }

      // Validate close size for partial closes
      if (params.size) {
        const closeSize = Number.parseFloat(params.size);
        if (Number.isNaN(closeSize) || closeSize <= 0) {
          return { isValid: false, error: PERPS_ERROR_CODES.ORDER_SIZE_MIN };
        }

        // Per-pool minimum order size for partial closes
        const price = params.currentPrice
          ? Number.parseFloat(params.currentPrice.toString())
          : undefined;
        const orderValueUSD =
          price && !Number.isNaN(closeSize) ? closeSize * price : undefined;

        if (orderValueUSD !== undefined) {
          let minimumOrderSize = MYX_MINIMUM_ORDER_SIZE_USD;
          try {
            let poolId: string | undefined;
            for (const [pid, sym] of this.#poolSymbolMap) {
              if (sym === params.symbol) {
                poolId = pid;
                break;
              }
            }
            if (poolId) {
              const poolConfig =
                await this.#clientService.getPoolLevelConfig(poolId);
              if (poolConfig.minOrderSizeInUsd > 0) {
                minimumOrderSize = poolConfig.minOrderSizeInUsd;
              }
            }
          } catch {
            // Non-fatal: use static fallback
          }

          if (orderValueUSD < minimumOrderSize) {
            return {
              isValid: false,
              error: PERPS_ERROR_CODES.ORDER_SIZE_MIN,
            };
          }
        }
      }
      // Full closes bypass minimum check — allows closing positions worth less than minimum

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error:
          error instanceof Error
            ? error.message
            : PERPS_ERROR_CODES.UNKNOWN_ERROR,
      };
    }
  }

  async validateWithdrawal(
    _params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: false, error: MYX_NOT_SUPPORTED_ERROR };
  }

  // ============================================================================
  // Protocol Calculations (Stage 1 - Default Values)
  // ============================================================================

  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    const { entryPrice, leverage, direction, asset } = params;

    if (
      !isFinite(entryPrice) ||
      !isFinite(leverage) ||
      entryPrice <= 0 ||
      leverage <= 0
    ) {
      return '0.00';
    }

    let maxLeverage = PERPS_CONSTANTS.DefaultMaxLeverage;
    if (asset) {
      try {
        maxLeverage = await this.getMaxLeverage(asset);
      } catch (error) {
        this.#deps.debugLogger.log(
          '[MYXProvider] Failed to get max leverage for liq price, using default',
          { asset, error },
        );
      }
    }

    const maintenanceLeverage = 2 * maxLeverage;
    const maintenanceMarginRatio = 1 / maintenanceLeverage;
    const side = direction === 'long' ? 1 : -1;

    const initialMargin = 1 / leverage;
    const maintenanceMargin = 1 / maintenanceLeverage;

    if (initialMargin < maintenanceMargin) {
      return '0.00';
    }

    try {
      const marginAvailable = initialMargin - maintenanceMargin;
      const denominator = 1 - maintenanceMarginRatio * side;

      if (Math.abs(denominator) < 0.0001) {
        return String(entryPrice);
      }

      const liquidationPrice =
        entryPrice - (side * marginAvailable * entryPrice) / denominator;

      return String(Math.max(0, liquidationPrice));
    } catch (error) {
      this.#deps.logger.error(
        ensureError(error, 'MYXProvider.calculateLiquidationPrice'),
        this.#getErrorContext('calculateLiquidationPrice', {
          asset: params.asset,
          entryPrice: params.entryPrice,
          leverage: params.leverage,
          direction: params.direction,
        }),
      );
      return '0.00';
    }
  }

  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    const { asset } = params;
    const maxLeverage = await this.getMaxLeverage(asset);
    return 1 / (2 * maxLeverage);
  }

  async getMaxLeverage(_asset: string): Promise<number> {
    return MYX_MAX_LEVERAGE;
  }

  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    const result: FeeCalculationResult = {
      feeRate: MYX_FEE_RATE,
      protocolFeeRate: MYX_PROTOCOL_FEE_RATE,
      metamaskFeeRate: 0, // Broker contract fee TBD
    };

    if (params.amount) {
      const parsedAmount = parseFloat(params.amount);
      if (isFinite(parsedAmount) && parsedAmount > 0) {
        result.feeAmount = parsedAmount * MYX_FEE_RATE;
        result.protocolFeeAmount = parsedAmount * MYX_PROTOCOL_FEE_RATE;
        result.metamaskFeeAmount = 0;
      }
    }

    return result;
  }

  // ============================================================================
  // Subscriptions (Stage 1 - No-op)
  // ============================================================================

  subscribeToPositions(params: SubscribePositionsParams): () => void {
    // MYX SDK has no WebSocket position streaming — use REST polling.
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const fetchAndNotify = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      try {
        const positions = await this.getPositions();
        if (!cancelled) {
          params.callback(positions);
        }
      } catch {
        // Non-fatal: keep polling
      }
      if (!cancelled) {
        pollTimeout = setTimeout(fetchAndNotify, MYX_PRICE_POLLING_INTERVAL_MS);
      }
    };

    fetchAndNotify().catch((error) => {
      this.#deps.debugLogger.log('[MYXProvider] subscribeToPositions error', {
        error: String(error),
      });
    });

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }

  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    // MYX SDK has no WebSocket fill streaming — use REST polling.
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const fetchAndNotify = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      try {
        const fills = await this.getOrderFills();
        if (!cancelled) {
          params.callback(fills);
        }
      } catch {
        // Non-fatal: keep polling
      }
      if (!cancelled) {
        pollTimeout = setTimeout(fetchAndNotify, MYX_PRICE_POLLING_INTERVAL_MS);
      }
    };

    fetchAndNotify().catch((error) => {
      this.#deps.debugLogger.log('[MYXProvider] subscribeToOrderFills error', {
        error: String(error),
      });
    });

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }

  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    // MYX SDK has no WebSocket order streaming — use REST polling.
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const fetchAndNotify = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      try {
        const orders = await this.getOpenOrders();
        if (!cancelled) {
          params.callback(orders);
        }
      } catch {
        // Non-fatal: keep polling
      }
      if (!cancelled) {
        pollTimeout = setTimeout(fetchAndNotify, MYX_PRICE_POLLING_INTERVAL_MS);
      }
    };

    fetchAndNotify().catch((error) => {
      this.#deps.debugLogger.log('[MYXProvider] subscribeToOrders error', {
        error: String(error),
      });
    });

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }

  subscribeToAccount(params: SubscribeAccountParams): () => void {
    // MYX SDK has no WebSocket account streaming — use REST polling.
    let cancelled = false;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const fetchAndNotify = async (): Promise<void> => {
      if (cancelled) {
        return;
      }
      try {
        const account = await this.getAccountState();
        if (!cancelled) {
          params.callback(account);
        }
      } catch {
        // Non-fatal: keep polling
      }
      if (!cancelled) {
        pollTimeout = setTimeout(fetchAndNotify, MYX_PRICE_POLLING_INTERVAL_MS);
      }
    };

    // Fetch immediately
    fetchAndNotify().catch(() => {
      // Error handled inside
    });

    return () => {
      cancelled = true;
      if (pollTimeout) {
        clearTimeout(pollTimeout);
      }
    };
  }

  subscribeToOICaps(params: SubscribeOICapsParams): () => void {
    // Stage 1: No OI caps - immediately call back with empty array
    // (matches HyperLiquid pattern which calls callback with cached data)
    setTimeout(() => params.callback([]), 0);
    return () => {
      /* noop */
    };
  }

  subscribeToCandles(params: SubscribeCandlesParams): () => void {
    const { symbol, interval, duration, callback, onError } = params;
    let cancelled = false;
    let wsCallback: ((data: MYXKlineDataResponse) => void) | null = null;
    let globalId: number | null = null;
    let currentCandleData: CandleData | null = null;

    // Map CandlePeriod to MYX KlineResolution
    const myxInterval = toMYXKlineResolution(interval);

    // Resolve symbol → poolId (same pattern as subscribeToPrices)
    const pool = this.#poolsCache.find(
      (item) => (item.baseSymbol || item.poolId) === symbol,
    );

    if (!pool) {
      this.#deps.debugLogger.log(
        '[MYXProvider] subscribeToCandles: No pool found for symbol',
        { symbol },
      );
      setTimeout(() => callback({ symbol, interval, candles: [] }), 0);
      return () => {
        cancelled = true;
      };
    }

    // Calculate limit from duration
    const limit = duration ? calculateCandleCount(duration, interval) : 100;

    this.#deps.debugLogger.log('[MYXProvider] subscribeToCandles', {
      symbol,
      interval,
      myxInterval,
      limit,
      poolId: pool.poolId,
    });

    const initAndSubscribe = async (): Promise<void> => {
      // Phase 1: REST fetch historical candles
      const klineData = await this.#clientService.getKlineData({
        poolId: pool.poolId,
        interval: myxInterval as KlineResolution,
        limit,
      });

      if (cancelled) {
        return;
      }

      currentCandleData = {
        symbol,
        interval,
        candles: klineData.map(adaptCandleFromMYX),
      };

      this.#deps.debugLogger.log('[MYXProvider] Historical candles received', {
        symbol,
        count: currentCandleData.candles.length,
      });

      callback(currentCandleData);

      // Phase 2: WS live updates (independent — failure does NOT erase REST data)
      try {
        globalId = await this.#clientService.getGlobalId(pool.poolId);

        if (cancelled) {
          return;
        }

        wsCallback = (data: MYXKlineDataResponse): void => {
          if (cancelled || !currentCandleData) {
            return;
          }

          const newCandle = adaptCandleFromMYXWebSocket(data.data);
          const { candles } = currentCandleData;
          const lastCandle = candles[candles.length - 1];

          if (lastCandle && lastCandle.time === newCandle.time) {
            // Same timestamp: update existing candle (live tick)
            currentCandleData = {
              ...currentCandleData,
              candles: [...candles.slice(0, -1), newCandle],
            };
          } else {
            // New timestamp: append new candle
            currentCandleData = {
              ...currentCandleData,
              candles: [...candles, newCandle],
            };
          }

          callback(currentCandleData);
        };

        this.#clientService.subscribeToKline(
          globalId,
          myxInterval as KlineResolution,
          wsCallback,
        );

        this.#deps.debugLogger.log(
          '[MYXProvider] WS kline subscription active',
          { symbol, globalId },
        );
      } catch (wsError) {
        this.#deps.debugLogger.log(
          '[MYXProvider] WS kline failed, REST data preserved',
          { symbol, error: String(wsError) },
        );
      }
    };

    initAndSubscribe().catch((error: unknown) => {
      if (cancelled) {
        return;
      }
      const wrappedError = ensureError(error, 'MYXProvider.subscribeToCandles');
      this.#deps.debugLogger.log('[MYXProvider] subscribeToCandles failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('subscribeToCandles', { symbol, interval }),
      });
      if (onError) {
        onError(wrappedError);
      }
      // Emit empty candles so the UI isn't stuck loading.
      // Use setTimeout to avoid promise/no-callback-in-promise lint rule.
      setTimeout(() => callback({ symbol, interval, candles: [] }), 0);
    });

    return () => {
      cancelled = true;
      if (wsCallback && globalId !== null) {
        this.#clientService.unsubscribeFromKline(
          globalId,
          myxInterval as KlineResolution,
          wsCallback,
        );
      }
    };
  }

  subscribeToOrderBook(params: SubscribeOrderBookParams): () => void {
    // Stage 1: No order book - immediately call back with empty data
    setTimeout(
      () =>
        params.callback({
          bids: [],
          asks: [],
          spread: '0',
          spreadPercentage: '0',
          midPrice: '0',
          lastUpdated: Date.now(),
          maxTotal: '0',
        }),
      0,
    );
    return () => {
      /* noop */
    };
  }

  setLiveDataConfig(_config: Partial<LiveDataConfig>): void {
    // Stage 1: No-op
  }

  // ============================================================================
  // Connection State (Stage 1 - REST Only)
  // ============================================================================

  getWebSocketConnectionState(): WebSocketConnectionState {
    // Stage 1: No WebSocket, report as connected (REST is always available)
    return WebSocketConnectionState.Connected;
  }

  subscribeToConnectionState(
    _listener: (
      state: WebSocketConnectionState,
      reconnectionAttempt: number,
    ) => void,
  ): () => void {
    // Stage 1: No WebSocket, no connection state changes
    return () => {
      /* noop */
    };
  }

  async reconnect(): Promise<void> {
    // Stage 1: No WebSocket to reconnect
    this.#deps.debugLogger.log('[MYXProvider] reconnect() is no-op in Stage 1');
  }

  // ============================================================================
  // Block Explorer
  // ============================================================================

  getBlockExplorerUrl(address?: string): string {
    const baseUrl = this.#isTestnet
      ? MYX_TESTNET_EXPLORER_URL
      : MYX_BLOCK_EXPLORER_URL;

    return address ? `${baseUrl}/address/${address}` : baseUrl;
  }

  // ============================================================================
  // Fee Discount (Stage 1 - No-op)
  // ============================================================================

  setUserFeeDiscount(_discountBips: number | undefined): void {
    // Stage 1: No fee discount support
  }

  // ============================================================================
  // HIP-3 Operations (N/A for MYX)
  // ============================================================================

  async getAvailableDexs(): Promise<string[]> {
    // MYX doesn't have HIP-3 equivalent
    return [];
  }
}
