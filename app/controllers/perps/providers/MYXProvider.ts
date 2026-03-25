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
import {
  Direction as MYXDirection,
  OrderType as MYXOrderType,
  TimeInForce as MYXTimeInForce,
  TriggerType as MYXTriggerType,
} from '@myx-trade/sdk';
import type {
  KlineResolution,
  PlaceOrderParams,
  PositionTpSlOrderParams,
} from '@myx-trade/sdk';

import { calculateCandleCount } from '../constants/chartConfig';
import {
  MYX_MAX_LEVERAGE,
  MYX_FEE_RATE,
  MYX_FEE_RATE_PRECISION,
  MYX_DEFAULT_TAKER_FEE_RATE,
  MYX_ACCOUNT_CONTRACTS,
  MYX_BLOCK_EXPLORER_URL,
  MYX_COLLATERAL_ASSET_IDS,
  MYX_DEFAULT_SLIPPAGE_BPS,
  MYX_EXECUTION_FEE_TOKEN,
  MYX_HISTORY_QUERY_LIMIT,
  MYX_MAINTENANCE_MARGIN_MULTIPLIER,
  MYX_MARKET_DETAIL_CACHE_TTL_MS,
  MYX_MIN_ORDER_SIZE_BUFFER,
  MYX_MAX_ORDER_VALUE_USD,
  MYX_MINIMUM_ORDER_SIZE_USD,
  MYX_NEAR_ZERO_THRESHOLD,
  MYX_ZERO_PRICE_FALLBACK,
  MYX_PRICE_POLLING_INTERVAL_MS,
  MYX_SLIPPAGE_BUFFER_HIGH,
  MYX_SLIPPAGE_BUFFER_LOW,
  toMYXSize,
  toMYXCollateral,
  toMYXContractPrice,
  fromMYXPrice,
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
  MYXUpdateOrderParams,
} from '../types/myx-types';
import { MYXOrderStatusEnum } from '../types/myx-types';
import type { CandleData } from '../types/perps-types';
import { ensureError } from '../utils/errorUtils';
import { validateOrderParams } from '../utils/hyperLiquidValidation';
import {
  adaptMarketFromMYX,
  adaptMarketDataFromMYX,
  adaptPriceFromMYX,
  adaptPositionFromMYX,
  adaptOrderFromMYX,
  adaptOrderItemFromMYX,
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

/** Shape of SDK result.data for write operations (order placement, close, TP/SL). */
type MYXTxResultData = { transactionHash?: string; orderId?: string };

/**
 * Safely extract transaction result data from SDK response.
 *
 * @param data - Raw result.data from the MYX SDK.
 * @returns Typed result with transactionHash/orderId, or undefined if not an object.
 */
function extractTxResult(data: unknown): MYXTxResultData | undefined {
  if (data && typeof data === 'object') {
    return data as MYXTxResultData;
  }
  return undefined;
}

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

  // Market detail cache (funding rate, OI, volume, oracle price) — refreshed every 60s
  readonly #marketDetailCache: Map<
    string,
    {
      funding: number;
      openInterest: number;
      volume: number;
      oraclePrice?: string;
      timestamp: number;
    }
  > = new Map();

  // Pools currently being fetched by #refreshMarketDetails (prevents duplicate requests)
  readonly #marketDetailInflight: Set<string> = new Set();

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

  /**
   * Reverse-lookup poolId from symbol via poolSymbolMap.
   *
   * @param symbol - The trading pair symbol to resolve.
   * @returns The poolId if found, otherwise undefined.
   */
  #resolvePoolId(symbol: string): string | undefined {
    for (const [pid, sym] of this.#poolSymbolMap) {
      if (sym === symbol) {
        return pid;
      }
    }
    return undefined;
  }

  // Fetch per-pool minimum order size in USD, falling back to the static constant.
  async #getMinimumOrderSize(symbol: string): Promise<number> {
    try {
      const poolId = this.#resolvePoolId(symbol);
      if (poolId) {
        const poolConfig = await this.#clientService.getPoolLevelConfig(poolId);
        if (poolConfig.minOrderSizeInUsd > 0) {
          return poolConfig.minOrderSizeInUsd;
        }
      }
    } catch {
      // Non-fatal: use static fallback
    }
    return MYX_MINIMUM_ORDER_SIZE_USD;
  }

  // Fetch the current ticker price for a pool. Returns 0 on failure.
  async #fetchTickerPrice(poolId: string): Promise<number> {
    const tickers = await this.#clientService.getTickers([poolId]);
    const price = Number.parseFloat(tickers[0]?.price ?? '0');
    return Number.isNaN(price) ? 0 : price;
  }

  // Validate order size against per-pool minimum.
  async #validateOrderSize(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string; minimumRequired?: number }> {
    const minimumOrderSize = await this.#getMinimumOrderSize(params.symbol);
    let orderValueUSD: number;

    if (params.usdAmount) {
      orderValueUSD = Number.parseFloat(params.usdAmount);
    } else {
      const size = Number.parseFloat(params.size || '0');
      const priceForValidation =
        params.currentPrice ??
        (params.price && params.orderType === 'limit'
          ? Number.parseFloat(params.price)
          : undefined);

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

    return { isValid: true };
  }

  // Validate leverage constraints.
  async #validateLeverage(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
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
      const orderValue = Number.parseFloat(params.size) * params.currentPrice;

      if (orderValue > MYX_MAX_ORDER_VALUE_USD) {
        return {
          isValid: false,
          error: PERPS_ERROR_CODES.ORDER_MAX_VALUE_EXCEEDED,
        };
      }
    }

    return { isValid: true };
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

    // Adapt signer to SignerLike shape (getAddress must return Promise<string>)
    const signerLike: import('@myx-trade/sdk').SignerLike = {
      getAddress: (): Promise<string> => Promise.resolve(signer.getAddress()),
      signMessage: (): Promise<string> =>
        Promise.reject(new Error('signMessage not implemented')),
      sendTransaction: (): Promise<{ hash: string }> =>
        Promise.reject(new Error('sendTransaction not implemented via signer')),
      signTypedData: signer.signTypedData
        ? (params: {
            domain: Record<string, unknown>;
            types: Record<string, unknown>;
            primaryType: string;
            message: Record<string, unknown>;
          }): Promise<string> =>
            signer.signTypedData(
              params.domain,
              params.types as Record<string, { name: string; type: string }[]>,
              params.message,
            )
        : undefined,
    };

    await this.#clientService.authenticate(signerLike, walletClient, address);
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
    const { symbols, callback, includeOrderBook, includeMarketData } = params;

    this.#deps.debugLogger.log('[MYXProvider] Setting up price subscription', {
      symbols: symbols.length,
      includeOrderBook,
      includeMarketData,
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
      // When includeMarketData is true, refresh market details (funding/OI) every 60s
      if (includeMarketData) {
        this.#refreshMarketDetails(poolIds);
      }

      // Convert tickers to PriceUpdate format
      const updates: PriceUpdate[] = tickers.map((ticker) => {
        const symbol = this.#poolSymbolMap.get(ticker.poolId) ?? ticker.poolId;
        const { price, change24h } = this.#getAdaptedPrice(ticker);

        const update: PriceUpdate = {
          symbol,
          price,
          timestamp: Date.now(),
          percentChange24h: change24h.toFixed(2),
          providerId: 'myx',
        };

        if (includeMarketData) {
          const cached = this.#marketDetailCache.get(ticker.poolId);
          // Prefer oracle price from SDK, fall back to ticker price
          update.markPrice = cached?.oraclePrice ?? price;

          if (cached) {
            update.funding = cached.funding;
            update.openInterest = cached.openInterest;
            // Use USD volume from getBaseDetail (ticker.volume is token-denominated)
            update.volume24h = cached.volume;
          }
        }

        return update;
      });

      callback(updates);
    });

    // Return unsubscribe function
    return () => {
      this.#deps.debugLogger.log('[MYXProvider] Unsubscribing from prices');
      this.#clientService.stopPricePolling();
    };
  }

  /**
   * Refresh market detail cache (funding rate + OI) for subscribed pools.
   * Only fetches if cache is stale (>60s).
   *
   * @param poolIds - Pool IDs to refresh market details for.
   */
  #refreshMarketDetails(poolIds: string[]): void {
    const MARKET_DETAIL_TTL_MS = MYX_MARKET_DETAIL_CACHE_TTL_MS;
    const now = Date.now();

    for (const poolId of poolIds) {
      const cached = this.#marketDetailCache.get(poolId);
      if (cached && now - cached.timestamp < MARKET_DETAIL_TTL_MS) {
        continue;
      }

      // Skip if a request is already in flight for this pool
      if (this.#marketDetailInflight.has(poolId)) {
        continue;
      }
      this.#marketDetailInflight.add(poolId);

      Promise.all([
        this.#clientService.getBaseDetail(poolId),
        this.#clientService.getOraclePrice(poolId).catch(() => null),
      ])
        .then(([detail, oracle]) => {
          this.#marketDetailCache.set(poolId, {
            funding: Number.parseFloat(detail.fundingRate || '0'),
            openInterest:
              Number.parseFloat(String(detail.longPosition) || '0') +
              Number.parseFloat(String(detail.shortPosition) || '0'),
            volume: Number.parseFloat(detail.volume || '0'),
            oraclePrice: oracle?.price,
            timestamp: Date.now(),
          });
          return undefined;
        })
        .catch(() => {
          // Non-fatal: market detail refresh failed, keep stale cache
        })
        .finally(() => {
          this.#marketDetailInflight.delete(poolId);
        });
    }
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

      // Resolve symbol → poolId
      const poolId = this.#resolvePoolId(params.symbol);
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
        ? Number.parseFloat(params.usdAmount)
        : Number.parseFloat(params.size) *
          (params.currentPrice ?? Number.parseFloat(params.price ?? '0'));

      // Validate minimum order size with 10% buffer for price movement
      const minOrderSize = await this.#getMinimumOrderSize(params.symbol);
      const minOrderSizeWithBuffer = minOrderSize * MYX_MIN_ORDER_SIZE_BUFFER;
      if (usdAmount < minOrderSizeWithBuffer) {
        return {
          success: false,
          error: `Order size $${usdAmount.toFixed(2)} is below minimum $${Math.ceil(minOrderSizeWithBuffer)}`,
        };
      }

      const collateralAmount = toMYXCollateral(usdAmount, network);

      // Compute trading fee: collateral * takerFeeRate / 1e8
      const takerFeeRate = BigInt(
        feeRates.takerFeeRate || String(MYX_DEFAULT_TAKER_FEE_RATE),
      );
      const tradingFee = (
        (BigInt(collateralAmount) * takerFeeRate) /
        BigInt(MYX_FEE_RATE_PRECISION)
      ).toString();

      // Determine price in 30-decimal format.
      // For market orders without an explicit price, fetch current market price
      // and apply 5% buffer: LONG → high accepted price, SHORT → low.
      let orderPrice = params.price ?? String(params.currentPrice ?? 0);
      if (orderPrice === '0' || orderPrice === '') {
        const tickerPriceNum = await this.#fetchTickerPrice(poolId);
        if (!tickerPriceNum) {
          return {
            success: false,
            error: 'Could not fetch current market price',
          };
        }
        const slippageMultiplier = params.isBuy
          ? MYX_SLIPPAGE_BUFFER_HIGH
          : MYX_SLIPPAGE_BUFFER_LOW;
        orderPrice = String(tickerPriceNum * slippageMultiplier);
      }
      const price30Dec = toMYXContractPrice(orderPrice);

      const direction = params.isBuy ? MYXDirection.LONG : MYXDirection.SHORT;

      const sdkOrderType =
        params.orderType === 'limit' ? MYXOrderType.LIMIT : MYXOrderType.MARKET;

      // Limit orders need a trigger type so the keeper knows when to execute:
      //   LONG limit (buy low):  LTE — trigger when price ≤ limit
      //   SHORT limit (sell high): GTE — trigger when price ≥ limit
      // Market orders use NONE — execute immediately.
      let triggerType: (typeof MYXTriggerType)[keyof typeof MYXTriggerType] =
        MYXTriggerType.NONE;
      if (params.orderType === 'limit') {
        triggerType = params.isBuy ? MYXTriggerType.LTE : MYXTriggerType.GTE;
      }

      // Build SDK PlaceOrderParams
      const sdkParams: PlaceOrderParams = {
        chainId,
        address,
        poolId,
        positionId: '', // Falsy → SDK uses placeOrderWithSalt for new positions
        orderType: sdkOrderType,
        triggerType,
        direction,
        collateralAmount,
        size: toMYXSize(params.size),
        price: price30Dec,
        timeInForce: MYXTimeInForce.IOC,
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
      const data = extractTxResult(result.data);

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

  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    try {
      await this.#ensureAuthenticated();
      const walletService = this.#getWalletService();
      const address = walletService.getUserAddress();
      const chainId = this.#clientService.getChainId();
      const network = this.#clientService.getNetwork();

      // Resolve symbol → poolId
      const poolId = this.#resolvePoolId(params.newOrder.symbol);
      if (!poolId) {
        return {
          success: false,
          error: `Unknown symbol: ${params.newOrder.symbol}`,
        };
      }

      // Get marketId (required by SDK updateOrderTpSl)
      const marketDetail = await this.#clientService.getMarketDetail(poolId);
      const quoteToken = MYX_EXECUTION_FEE_TOKEN[network];

      // Build SDK UpdateOrderParams
      const sdkParams: MYXUpdateOrderParams = {
        orderId: String(params.orderId),
        size: toMYXSize(params.newOrder.size),
        price: toMYXContractPrice(params.newOrder.price ?? '0'),
        tpSize: '0',
        tpPrice: params.newOrder.takeProfitPrice
          ? toMYXContractPrice(params.newOrder.takeProfitPrice)
          : '0',
        slSize: '0',
        slPrice: params.newOrder.stopLossPrice
          ? toMYXContractPrice(params.newOrder.stopLossPrice)
          : '0',
        useOrderCollateral: true,
        executionFeeToken: MYX_EXECUTION_FEE_TOKEN[network],
      };

      this.#deps.debugLogger.log('[MYXProvider.editOrder] SDK params', {
        orderId: sdkParams.orderId,
        poolId,
        marketId: marketDetail.marketId,
        size: sdkParams.size,
        price: sdkParams.price,
        quoteToken,
      });

      const result = await this.#clientService.updateOrderTpSl(
        sdkParams,
        quoteToken,
        chainId,
        address,
        marketDetail.marketId,
      );

      this.#deps.debugLogger.log('[MYXProvider.editOrder] SDK result', {
        code: result.code,
        message: result.message,
      });

      if (result.code !== 0) {
        return {
          success: false,
          error:
            `MYX edit failed: code=${result.code} ${result.message ?? ''}`.trim(),
        };
      }

      return {
        success: true,
        orderId: String(params.orderId),
        providerId: 'myx',
      };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.editOrder');
      this.#deps.debugLogger.log('[MYXProvider.editOrder] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('editOrder', {
          orderId: String(params.orderId),
        }),
      );
      return {
        success: false,
        error: wrappedError.message,
      };
    }
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
    params: BatchCancelOrdersParams,
  ): Promise<CancelOrdersResult> {
    try {
      await this.#ensureAuthenticated();
      const chainId = this.#clientService.getChainId();
      this.#deps.debugLogger.log('[MYXProvider.cancelOrders] START', {
        count: params.length,
      });

      const orderIds = params.map((entry) => entry.orderId);
      const result = await this.#clientService.cancelOrders(orderIds, chainId);

      if (result.code !== 0) {
        return {
          success: false,
          successCount: 0,
          failureCount: params.length,
          results: params.map((entry) => ({
            orderId: entry.orderId,
            symbol: entry.symbol,
            success: false,
            error:
              `MYX batch cancel failed: code=${result.code} ${result.message ?? ''}`.trim(),
          })),
        };
      }

      return {
        success: true,
        successCount: params.length,
        failureCount: 0,
        results: params.map((entry) => ({
          orderId: entry.orderId,
          symbol: entry.symbol,
          success: true,
        })),
      };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.cancelOrders');
      this.#deps.debugLogger.log('[MYXProvider.cancelOrders] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('cancelOrders'),
      );
      return {
        success: false,
        successCount: 0,
        failureCount: params.length,
        results: params.map((entry) => ({
          orderId: entry.orderId,
          symbol: entry.symbol,
          success: false,
          error: wrappedError.message,
        })),
      };
    }
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
      const poolId = this.#resolvePoolId(params.symbol);
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

      // Determine close size — keep as string to avoid float precision loss.
      // parseFloat round-trips lose least-significant digits, leaving dust
      // when the 18-decimal integer is reconstructed by toMYXSize().
      // Treat empty string as "close full position" (same as undefined)
      const closeSizeStr =
        (params.size === '' ? undefined : params.size) ?? rawPos.size;
      const closeSizeNum = Number.parseFloat(closeSizeStr);

      if (!closeSizeNum || Number.isNaN(closeSizeNum)) {
        return {
          success: false,
          error: 'Invalid close size',
        };
      }

      // Determine close price — apply slippage: LONG sells low, SHORT buys high
      const slippage =
        rawPos.direction === MYXDirection.LONG
          ? MYX_SLIPPAGE_BUFFER_LOW
          : MYX_SLIPPAGE_BUFFER_HIGH;
      let closePrice: number;
      if (params.price) {
        closePrice = Number.parseFloat(params.price);
      } else {
        const basePrice =
          params.currentPrice ?? (await this.#fetchTickerPrice(poolId));
        if (!basePrice) {
          return {
            success: false,
            error: 'Could not fetch current market price for close',
          };
        }
        closePrice = basePrice * slippage;
      }

      // SDK expects 30-decimal price and 18-decimal size
      const sdkOrderType =
        params.orderType === 'limit' ? MYXOrderType.LIMIT : MYXOrderType.MARKET;

      // Limit close orders need trigger type:
      // Closing a LONG (sell) → GTE — trigger when price ≥ limit
      // Closing a SHORT (buy) → LTE — trigger when price ≤ limit
      let closeTriggerType: (typeof MYXTriggerType)[keyof typeof MYXTriggerType] =
        MYXTriggerType.NONE;
      if (params.orderType === 'limit') {
        closeTriggerType =
          rawPos.direction === MYXDirection.LONG
            ? MYXTriggerType.GTE
            : MYXTriggerType.LTE;
      }

      const { userLeverage } = rawPos;

      const sdkParams: PlaceOrderParams = {
        chainId,
        address,
        poolId,
        positionId: rawPos.positionId,
        orderType: sdkOrderType,
        triggerType: closeTriggerType,
        direction: rawPos.direction,
        collateralAmount: '0',
        size: toMYXSize(closeSizeStr),
        price: toMYXContractPrice(closePrice),
        timeInForce: MYXTimeInForce.IOC,
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
        direction: rawPos.direction === MYXDirection.LONG ? 'LONG' : 'SHORT',
        closeSize: closeSizeStr,
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

      const data = extractTxResult(result.data);

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
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    try {
      await this.#ensureAuthenticated();
      const positions = await this.getPositions();

      // Filter: closeAll or specific symbols
      const toClose =
        params.closeAll || !params.symbols?.length
          ? positions
          : positions.filter((pos) => params.symbols?.includes(pos.symbol));

      if (toClose.length === 0) {
        return { success: true, successCount: 0, failureCount: 0, results: [] };
      }

      const results: ClosePositionsResult['results'] = [];
      let successCount = 0;
      let failureCount = 0;

      // Sequential close — each is an on-chain tx, parallel would flood the nonce
      for (const position of toClose) {
        const result = await this.closePosition({
          symbol: position.symbol,
          size: position.size,
        });
        if (result.success) {
          successCount += 1;
          results.push({ symbol: position.symbol, success: true });
        } else {
          failureCount += 1;
          results.push({
            symbol: position.symbol,
            success: false,
            error: result.error,
          });
        }
      }

      return {
        success: failureCount === 0,
        successCount,
        failureCount,
        results,
      };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.closePositions',
      );
      this.#deps.debugLogger.log('[MYXProvider.closePositions] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('closePositions'),
      );
      return {
        success: false,
        successCount: 0,
        failureCount: 1,
        results: [
          { symbol: 'unknown', success: false, error: wrappedError.message },
        ],
      };
    }
  }

  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    try {
      this.#deps.debugLogger.log('[MYXProvider.updatePositionTPSL] START', {
        symbol: params.symbol,
        takeProfitPrice: params.takeProfitPrice,
        stopLossPrice: params.stopLossPrice,
      });

      await this.#ensureAuthenticated();
      const walletService = this.#getWalletService();
      const address = walletService.getUserAddress();
      const chainId = this.#clientService.getChainId();
      const network = this.#clientService.getNetwork();

      // Resolve symbol → poolId
      const poolId = this.#resolvePoolId(params.symbol);
      if (!poolId) {
        return {
          success: false,
          error: `No MYX pool found for symbol "${params.symbol}"`,
        };
      }

      // Find the position to update TP/SL on
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
      const { userLeverage } = rawPos;

      // TP/SL size defaults to full position (close entire position on trigger)
      const positionSize = toMYXSize(rawPos.size);

      const sdkParams: PositionTpSlOrderParams = {
        chainId,
        address,
        poolId,
        positionId: rawPos.positionId,
        executionFeeToken: MYX_EXECUTION_FEE_TOKEN[network],
        tpTriggerType:
          rawPos.direction === MYXDirection.LONG
            ? MYXTriggerType.GTE
            : MYXTriggerType.LTE,
        slTriggerType:
          rawPos.direction === MYXDirection.LONG
            ? MYXTriggerType.LTE
            : MYXTriggerType.GTE,
        direction: rawPos.direction,
        leverage: userLeverage,
        tpPrice: params.takeProfitPrice
          ? toMYXContractPrice(params.takeProfitPrice)
          : '0',
        tpSize: params.takeProfitPrice ? positionSize : '0',
        slPrice: params.stopLossPrice
          ? toMYXContractPrice(params.stopLossPrice)
          : '0',
        slSize: params.stopLossPrice ? positionSize : '0',
        slippagePct: String(MYX_DEFAULT_SLIPPAGE_BPS),
      };

      this.#deps.debugLogger.log(
        '[MYXProvider.updatePositionTPSL] SDK params',
        {
          poolId,
          positionId: rawPos.positionId,
          tpPrice: sdkParams.tpPrice,
          slPrice: sdkParams.slPrice,
        },
      );

      const result =
        await this.#clientService.createPositionTpSlOrder(sdkParams);

      if (result.code !== 0) {
        return {
          success: false,
          error:
            `MYX TP/SL failed: code=${result.code} ${result.message ?? ''}`.trim(),
        };
      }

      const data = extractTxResult(result.data);

      return {
        success: true,
        orderId: data?.transactionHash ?? data?.orderId,
        providerId: 'myx',
      };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.updatePositionTPSL',
      );
      this.#deps.debugLogger.log('[MYXProvider.updatePositionTPSL] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('updatePositionTPSL', {
          symbol: params.symbol,
        }),
      );
      return {
        success: false,
        error: wrappedError.message,
      };
    }
  }

  async updateMargin(params: UpdateMarginParams): Promise<MarginResult> {
    try {
      this.#deps.debugLogger.log('[MYXProvider.updateMargin] START', {
        symbol: params.symbol,
        amount: params.amount,
      });

      await this.#ensureAuthenticated();
      const walletService = this.#getWalletService();
      const address = walletService.getUserAddress();
      const chainId = this.#clientService.getChainId();
      const network = this.#clientService.getNetwork();

      // Resolve symbol → poolId
      const poolId = this.#resolvePoolId(params.symbol);
      if (!poolId) {
        return {
          success: false,
          error: `No MYX pool found for symbol "${params.symbol}"`,
        };
      }

      // Find the position
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
      const adjustAmount = toMYXCollateral(
        Number.parseFloat(params.amount),
        network,
      );

      // Quote token is the collateral token (USDC/USDT), not the account contract
      const quoteToken = MYX_EXECUTION_FEE_TOKEN[network];

      const result = await this.#clientService.adjustCollateral({
        poolId,
        positionId: rawPos.positionId,
        adjustAmount,
        quoteToken,
        chainId,
        address,
      });

      if (result.code !== 0) {
        return {
          success: false,
          error:
            `MYX margin adjustment failed: code=${result.code} ${result.message ?? ''}`.trim(),
        };
      }

      return {
        success: true,
      };
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.updateMargin');
      this.#deps.debugLogger.log('[MYXProvider.updateMargin] ERROR', {
        message: wrappedError.message,
      });
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('updateMargin', { symbol: params.symbol }),
      );
      return {
        success: false,
        error: wrappedError.message,
      };
    }
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

      return this.#adaptAndEnrichPositions(result.data, address);
    } catch (caughtError) {
      const wrappedError = ensureError(caughtError, 'MYXProvider.getPositions');
      this.#deps.debugLogger.log('[MYXProvider] getPositions failed', {
        error: String(wrappedError),
        ...this.#getErrorContext('getPositions'),
      });
      return [];
    }
  }

  /**
   * Adapt raw MYX positions and enrich with ticker prices and TP/SL from trigger orders.
   * Shared by getPositions() (REST) and WS position subscription callback.
   *
   * @param rawPositions - Raw MYX position data from SDK.
   * @param address - User wallet address for TP/SL order lookup.
   * @returns Adapted positions with ticker prices and TP/SL injected.
   */
  async #adaptAndEnrichPositions(
    rawPositions: import('../types/myx-types').MYXPositionType[],
    address: string,
  ): Promise<Position[]> {
    const activePositions = rawPositions.filter(
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
        const price = Number.parseFloat(ticker.price);
        if (!Number.isNaN(price) && price > 0) {
          tickerPriceMap.set(ticker.poolId, price);
        }
      }
    } catch {
      // Non-fatal: positions still returned without PnL
    }

    // Fetch open orders to cross-reference TP/SL trigger orders with positions.
    // MYX TP/SL are separate trigger orders, not position attributes.
    // We match by positionId and inject takeProfitPrice/stopLossPrice.
    const tpslByPosition = await this.#fetchTpslByPosition(address);

    return activePositions.map((pos) => {
      const position = adaptPositionFromMYX(
        pos,
        this.#poolSymbolMap,
        tickerPriceMap.get(pos.poolId),
      );
      // Inject TP/SL from trigger orders
      const tpsl = tpslByPosition.get(pos.positionId);
      if (tpsl) {
        position.takeProfitPrice = tpsl.takeProfitPrice;
        position.stopLossPrice = tpsl.stopLossPrice;
      }
      return position;
    });
  }

  /**
   * Fetch TP/SL trigger order prices grouped by positionId.
   * Used by both REST getPositions and WS position callback.
   *
   * @param address - User wallet address for order lookup.
   * @returns Map of positionId to TP/SL prices.
   */
  async #fetchTpslByPosition(
    address: string,
  ): Promise<
    Map<string, { takeProfitPrice?: string; stopLossPrice?: string }>
  > {
    const tpslByPosition = new Map<
      string,
      { takeProfitPrice?: string; stopLossPrice?: string }
    >();
    try {
      const ordersResult = await this.#clientService.getOrders(address);
      if (ordersResult.data && Array.isArray(ordersResult.data)) {
        for (const order of ordersResult.data) {
          // Trigger orders: orderType 2 (Stop) or 3 (Conditional), operation 1 (decrease)
          if (
            (order.orderType === 2 || order.orderType === 3) &&
            order.operation === 1 &&
            order.positionId
          ) {
            const existing = tpslByPosition.get(order.positionId) ?? {};
            const priceStr = fromMYXPrice(order.price).toString();
            // For LONG: GTE (triggerType=1) = TP, LTE (triggerType=2) = SL
            // For SHORT: LTE (triggerType=2) = TP, GTE (triggerType=1) = SL
            const isLong = order.direction === 0;
            const isGTE = order.triggerType === 1;
            const isTakeProfit = isLong ? isGTE : !isGTE;
            if (isTakeProfit) {
              existing.takeProfitPrice = priceStr;
            } else {
              existing.stopLossPrice = priceStr;
            }
            tpslByPosition.set(order.positionId, existing);
          }
        }
      }
    } catch {
      // Non-fatal: positions still returned without TP/SL
    }
    return tpslByPosition;
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

      // Fetch positions for weighted ROE calculation (non-fatal if it fails)
      let positions: Position[] = [];
      try {
        positions = await this.getPositions();
      } catch {
        // Non-fatal: account state still returned without ROE
      }

      return adaptAccountStateFromMYX(
        accountData,
        this.#clientService.getNetwork(),
        positions,
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
        { limit: MYX_HISTORY_QUERY_LIMIT },
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
      await this.#ensureAuthenticated();
      const address = this.#getWalletService().getUserAddress();

      // Use order.getOrders (returns active/pending orders) instead of
      // api.getPoolOpenOrders (requires access token which may be null).
      const result = await this.#clientService.getOrders(address);
      if (!result.data || !Array.isArray(result.data)) {
        return [];
      }

      return result.data.map((order) =>
        adaptOrderItemFromMYX(order, this.#poolSymbolMap),
      );
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
        { limit: MYX_HISTORY_QUERY_LIMIT },
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
        { limit: MYX_HISTORY_QUERY_LIMIT },
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
        { limit: MYX_HISTORY_QUERY_LIMIT },
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

      // Full closes bypass minimum order size check
      if (!(params.reduceOnly && params.isFullClose)) {
        const sizeCheckResult = await this.#validateOrderSize(params);
        if (!sizeCheckResult.isValid) {
          return sizeCheckResult;
        }
      }

      const leverageCheck = await this.#validateLeverage(params);
      if (!leverageCheck.isValid) {
        return leverageCheck;
      }

      return { isValid: true };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.validateOrder',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('validateOrder', {
          symbol: params.symbol,
        }),
      );
      return {
        isValid: false,
        error: wrappedError.message,
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

      // Validate close size for partial closes (full closes bypass minimum check)
      if (params.size) {
        const closeSize = Number.parseFloat(params.size);
        if (Number.isNaN(closeSize) || closeSize <= 0) {
          return { isValid: false, error: PERPS_ERROR_CODES.ORDER_SIZE_MIN };
        }

        const price = params.currentPrice
          ? Number.parseFloat(params.currentPrice.toString())
          : undefined;

        if (price) {
          const minimumOrderSize = await this.#getMinimumOrderSize(
            params.symbol,
          );
          if (closeSize * price < minimumOrderSize) {
            return { isValid: false, error: PERPS_ERROR_CODES.ORDER_SIZE_MIN };
          }
        }
      }

      return { isValid: true };
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.validateClosePosition',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('validateClosePosition', {
          symbol: params.symbol,
        }),
      );
      return {
        isValid: false,
        error: wrappedError.message,
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
      !Number.isFinite(entryPrice) ||
      !Number.isFinite(leverage) ||
      entryPrice <= 0 ||
      leverage <= 0
    ) {
      return MYX_ZERO_PRICE_FALLBACK;
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

    const maintenanceLeverage = MYX_MAINTENANCE_MARGIN_MULTIPLIER * maxLeverage;
    const maintenanceMarginRatio = 1 / maintenanceLeverage;
    const side = direction === 'long' ? 1 : -1;

    const initialMargin = 1 / leverage;
    const maintenanceMargin = 1 / maintenanceLeverage;

    if (initialMargin < maintenanceMargin) {
      return MYX_ZERO_PRICE_FALLBACK;
    }

    try {
      const marginAvailable = initialMargin - maintenanceMargin;
      const denominator = 1 - maintenanceMarginRatio * side;

      if (Math.abs(denominator) < MYX_NEAR_ZERO_THRESHOLD) {
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
      return MYX_ZERO_PRICE_FALLBACK;
    }
  }

  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    const { asset } = params;
    const maxLeverage = await this.getMaxLeverage(asset);
    return 1 / (MYX_MAINTENANCE_MARGIN_MULTIPLIER * maxLeverage);
  }

  async getMaxLeverage(_asset: string): Promise<number> {
    return MYX_MAX_LEVERAGE;
  }

  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    // Fetch dynamic fee rate from MYX API, fall back to default constant
    let feeRateDecimal = MYX_FEE_RATE;
    try {
      const chainId = this.#clientService.getChainId();
      const rates = await this.#clientService.getUserTradingFeeRate(
        0,
        0,
        chainId,
      );
      const rateNum = Number.parseInt(rates.takerFeeRate, 10);
      if (rateNum > 0) {
        feeRateDecimal = rateNum / MYX_FEE_RATE_PRECISION;
      }
    } catch {
      // Non-fatal: use static fallback
    }

    const result: FeeCalculationResult = {
      feeRate: feeRateDecimal,
      protocolFeeRate: feeRateDecimal,
      metamaskFeeRate: 0, // Broker revenue comes via referral rebates, not a separate fee line
    };

    if (params.amount) {
      const parsedAmount = Number.parseFloat(params.amount);
      if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
        result.feeAmount = parsedAmount * feeRateDecimal;
        result.protocolFeeAmount = parsedAmount * feeRateDecimal;
        result.metamaskFeeAmount = 0;
      }
    }

    return result;
  }

  // ============================================================================
  // Subscriptions (WS + REST heartbeat hybrid)
  // ============================================================================

  subscribeToPositions(params: SubscribePositionsParams): () => void {
    // Hybrid: WS subscription for instant pushes + REST heartbeat as safety net.
    // MYX SDK subscribePosition() is wired but server doesn't push yet
    // (verified via PoC wsSubscriptions.ts). REST heartbeat ensures freshness.
    // When MYX enables push, the WS callback will deliver instant updates
    // and the REST poll acts as a fallback only.
    let cancelled = false;
    let wsCallback: ((data: unknown) => void) | null = null;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const pollPositions = async (): Promise<void> => {
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
        pollTimeout = setTimeout(pollPositions, MYX_PRICE_POLLING_INTERVAL_MS);
      }
    };

    const setup = async (): Promise<void> => {
      try {
        await this.#ensureAuthenticated();
        const address = this.#getWalletService().getUserAddress();

        // Attempt WS subscription (non-fatal if it fails)
        try {
          wsCallback = async (rawData: unknown): Promise<void> => {
            if (cancelled) {
              return;
            }
            try {
              const rawPositions = Array.isArray(rawData) ? rawData : [];
              const positions = await this.#adaptAndEnrichPositions(
                rawPositions as import('../types/myx-types').MYXPositionType[],
                address,
              );
              if (!cancelled) {
                params.callback(positions);
              }
            } catch (adaptError) {
              this.#deps.debugLogger.log(
                '[MYXProvider] WS position adapt error',
                { error: String(adaptError) },
              );
            }
          };

          await this.#clientService.subscribeToPositions(wsCallback);
          this.#deps.debugLogger.log(
            '[MYXProvider] Position WS subscription active, REST heartbeat continues',
          );
        } catch (wsError) {
          wsCallback = null;
          this.#deps.debugLogger.log(
            '[MYXProvider] Position WS subscription failed, REST-only mode',
            { error: String(wsError) },
          );
        }
      } catch {
        // Auth failed — REST polling still works (getPositions calls ensureAuthenticated)
      }

      // Always run REST heartbeat polling
      pollPositions().catch(() => {
        // Error handled inside
      });
    };

    setup().catch((error) => {
      this.#deps.debugLogger.log('[MYXProvider] subscribeToPositions error', {
        error: String(error),
      });
    });

    return () => {
      cancelled = true;
      if (wsCallback) {
        this.#clientService.unsubscribeFromPositions(wsCallback);
      }
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
    // Hybrid: WS subscription for instant pushes + REST heartbeat as safety net.
    let cancelled = false;
    let wsCallback: ((data: unknown) => void) | null = null;
    let pollTimeout: ReturnType<typeof setTimeout> | undefined;

    const pollOrders = async (): Promise<void> => {
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
        pollTimeout = setTimeout(pollOrders, MYX_PRICE_POLLING_INTERVAL_MS);
      }
    };

    const setup = async (): Promise<void> => {
      try {
        await this.#ensureAuthenticated();

        // Attempt WS subscription (non-fatal if it fails)
        try {
          wsCallback = async (rawData: unknown): Promise<void> => {
            if (cancelled) {
              return;
            }
            try {
              const rawOrders = Array.isArray(rawData) ? rawData : [];
              const orders = rawOrders.map((order) =>
                adaptOrderItemFromMYX(
                  order as import('../types/myx-types').MYXOrderItem,
                  this.#poolSymbolMap,
                ),
              );
              if (!cancelled) {
                params.callback(orders);
              }
            } catch (adaptError) {
              this.#deps.debugLogger.log('[MYXProvider] WS order adapt error', {
                error: String(adaptError),
              });
            }
          };

          await this.#clientService.subscribeToOrders(wsCallback);
          this.#deps.debugLogger.log(
            '[MYXProvider] Order WS subscription active, REST heartbeat continues',
          );
        } catch (wsError) {
          wsCallback = null;
          this.#deps.debugLogger.log(
            '[MYXProvider] Order WS subscription failed, REST-only mode',
            { error: String(wsError) },
          );
        }
      } catch {
        // Auth failed — REST polling still works (getOpenOrders calls ensureAuthenticated)
      }

      // Always run REST heartbeat polling
      pollOrders().catch(() => {
        // Error handled inside
      });
    };

    setup().catch((error) => {
      this.#deps.debugLogger.log('[MYXProvider] subscribeToOrders error', {
        error: String(error),
      });
    });

    return () => {
      cancelled = true;
      if (wsCallback) {
        this.#clientService.unsubscribeFromOrders(wsCallback);
      }
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
          const lastCandle = candles.at(-1);

          if (lastCandle?.time === newCandle.time) {
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
    const network = this.#isTestnet ? 'testnet' : 'mainnet';
    const baseUrl = MYX_BLOCK_EXPLORER_URL[network];

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
