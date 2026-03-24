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
import type { KlineResolution } from '@myx-trade/sdk';

import { calculateCandleCount } from '../constants/chartConfig';
import {
  MYX_MAX_LEVERAGE,
  MYX_FEE_RATE,
  MYX_PROTOCOL_FEE_RATE,
} from '../constants/myxConfig';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsControllerMessenger } from '../PerpsController';
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
import { MYXOrderStatusEnum } from '../types/myx-types';
import type {
  MYXAuthConfig,
  MYXKlineDataResponse,
  MYXPoolSymbol,
  MYXTicker,
} from '../types/myx-types';
import type { CandleData } from '../types/perps-types';
import { ensureError } from '../utils/errorUtils';
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

      return this.#poolsCache.map((pool) => adaptMarketFromMYX(pool));
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
    // Stage 1: No deposit support
    return [];
  }

  getWithdrawalRoutes(_params?: GetSupportedPathsParams): AssetRoute[] {
    // Stage 1: No withdrawal support
    return [];
  }

  // ============================================================================
  // Trading Operations (Stage 1 - All Stubbed)
  // ============================================================================

  async placeOrder(_params: OrderParams): Promise<OrderResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
  }

  async editOrder(_params: EditOrderParams): Promise<OrderResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
  }

  async cancelOrder(_params: CancelOrderParams): Promise<CancelOrderResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
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

  async closePosition(_params: ClosePositionParams): Promise<OrderResult> {
    return {
      success: false,
      error: MYX_NOT_SUPPORTED_ERROR,
    };
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

      // Filter out zero-size positions
      return result.data
        .filter((pos) => pos.size && pos.size !== '0')
        .map((pos) => adaptPositionFromMYX(pos, this.#poolSymbolMap));
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

      // Fetch wallet balance
      let walletBalance: string | undefined;
      try {
        const balanceResult =
          await this.#clientService.getWalletQuoteTokenBalance(
            chainId,
            address,
          );
        walletBalance = String(balanceResult.data ?? '0');
      } catch {
        // Non-fatal: wallet balance is supplementary
        walletBalance = '0';
      }

      // Try to get account info from first pool
      let accountInfo: Record<string, unknown> | undefined;
      if (this.#poolsCache.length > 0) {
        try {
          const infoResult = await this.#clientService.getAccountInfo(
            chainId,
            address,
            this.#poolsCache[0].poolId,
          );
          accountInfo = infoResult.data;
        } catch {
          // Non-fatal: we'll return what we have
        }
      }

      return adaptAccountStateFromMYX(accountInfo, walletBalance);
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
    return { isValid: false, error: MYX_NOT_SUPPORTED_ERROR };
  }

  async validateOrder(
    _params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: false, error: MYX_NOT_SUPPORTED_ERROR };
  }

  async validateClosePosition(
    _params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return { isValid: false, error: MYX_NOT_SUPPORTED_ERROR };
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
    _params: LiquidationPriceParams,
  ): Promise<string> {
    return '0';
  }

  async calculateMaintenanceMargin(
    _params: MaintenanceMarginParams,
  ): Promise<number> {
    return 0;
  }

  async getMaxLeverage(_asset: string): Promise<number> {
    return MYX_MAX_LEVERAGE;
  }

  async calculateFees(
    _params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    return {
      feeRate: MYX_FEE_RATE,
      protocolFeeRate: MYX_PROTOCOL_FEE_RATE,
    };
  }

  // ============================================================================
  // Subscriptions (Stage 1 - No-op)
  // ============================================================================

  subscribeToPositions(params: SubscribePositionsParams): () => void {
    // Stage 1: No position tracking - immediately call back with empty array
    // to signal loading is complete (no data to show)
    setTimeout(() => params.callback([]), 0);
    return () => {
      /* noop */
    };
  }

  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    // Stage 1: No fill tracking - immediately call back with empty array
    setTimeout(() => params.callback([]), 0);
    return () => {
      /* noop */
    };
  }

  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    // Stage 1: No order tracking - immediately call back with empty array
    setTimeout(() => params.callback([]), 0);
    return () => {
      /* noop */
    };
  }

  subscribeToAccount(params: SubscribeAccountParams): () => void {
    // Stage 1: Empty account state - immediately call back
    setTimeout(
      () =>
        params.callback({
          availableBalance: '0',
          totalBalance: '0',
          marginUsed: '0',
          unrealizedPnl: '0',
          returnOnEquity: '0',
        }),
      0,
    );
    return () => {
      /* noop */
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
