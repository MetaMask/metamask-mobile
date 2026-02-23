/**
 * MYXProvider
 *
 * Stage 1 provider implementation for MYX protocol.
 * Implements the PerpsProvider interface with read-only operations.
 * Trading functionality will be added in Stage 3.
 *
 * Key differences from HyperLiquid:
 * - Uses USDT collateral on BNB chain (vs USDC on Arbitrum)
 * - Multi-Pool Model: multiple pools can exist per symbol
 * - Uses REST polling for prices (WebSocket deferred to Stage 3)
 */

import type { CaipAccountId } from '@metamask/utils';

import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import { MYXClientService } from '../services/MYXClientService';
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
  UpdatePositionTPSLParams,
  UserHistoryItem,
  WithdrawParams,
  WithdrawResult,
  RawLedgerUpdate,
} from '../types';
import type { MYXPoolSymbol, MYXTicker } from '../types/myx-types';
import { ensureError } from '../utils/errorUtils';
import {
  adaptMarketFromMYX,
  adaptMarketDataFromMYX,
  adaptPriceFromMYX,
  filterMYXExclusiveMarkets,
  buildPoolSymbolMap,
} from '../utils/myxAdapter';

// ============================================================================
// Constants
// ============================================================================

const MYX_NOT_SUPPORTED_ERROR = 'MYX trading not yet supported';
const MYX_BLOCK_EXPLORER_URL = 'https://bscscan.com';
const MYX_TESTNET_EXPLORER_URL = 'https://testnet.bscscan.com';

// ============================================================================
// MYXProvider
// ============================================================================

/**
 * MYX provider implementation
 *
 * Stage 1: Read-only operations (markets, prices)
 * Trading operations return errors until Stage 3.
 */
export class MYXProvider implements PerpsProvider {
  readonly protocolId = 'myx';

  // Platform dependencies
  readonly #deps: PerpsPlatformDependencies;

  // Client service
  readonly #clientService: MYXClientService;

  // Configuration
  readonly #isTestnet: boolean;

  // Cache for pools (freshness delegated to MYXClientService)
  #poolsCache: MYXPoolSymbol[] = [];

  #poolSymbolMap: Map<string, string> = new Map();

  // Ticker cache for price data
  readonly #tickersCache: Map<string, MYXTicker> = new Map();

  constructor(options: {
    isTestnet?: boolean;
    platformDependencies: PerpsPlatformDependencies;
  }) {
    this.#deps = options.platformDependencies;
    this.#isTestnet = options.isTestnet ?? true; // Force testnet in Stage 1

    // Initialize client service
    this.#clientService = new MYXClientService(this.#deps, {
      isTestnet: this.#isTestnet,
    });

    this.#deps.debugLogger.log('[MYXProvider] Constructor complete', {
      protocolId: this.protocolId,
      isTestnet: this.#isTestnet,
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
    // Stage 1: Trading not supported
    return {
      ready: false,
      error: 'MYX trading not yet supported',
      walletConnected: false,
      networkSupported: this.#isTestnet,
    };
  }

  // ============================================================================
  // Market Data Operations (Stage 1 - Fully Implemented)
  // ============================================================================

  // TODO: Align error handling - read operations should return empty defaults
  // instead of throwing, matching HyperLiquid pattern
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
      throw wrappedError;
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

      // Transform to PerpsMarketData
      return this.#poolsCache.map((pool) => {
        const ticker = tickerMap.get(pool.poolId);
        return adaptMarketDataFromMYX(
          pool,
          ticker,
          this.#deps.marketDataFormatters,
        );
      });
    } catch (caughtError) {
      const wrappedError = ensureError(
        caughtError,
        'MYXProvider.getMarketDataWithPrices',
      );
      this.#deps.logger.error(
        wrappedError,
        this.#getErrorContext('getMarketDataWithPrices'),
      );
      throw wrappedError;
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

  async updateMargin(_params: {
    symbol: string;
    amount: string;
    isAdd: boolean;
  }): Promise<MarginResult> {
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
  // Account Operations (Stage 1 - Empty Returns)
  // ============================================================================

  async getPositions(_params?: GetPositionsParams): Promise<Position[]> {
    // Stage 1: No position tracking
    return [];
  }

  async getAccountState(
    _params?: GetAccountStateParams,
  ): Promise<AccountState> {
    // Stage 1: Empty account state
    return {
      availableBalance: '0',
      totalBalance: '0',
      marginUsed: '0',
      unrealizedPnl: '0',
      returnOnEquity: '0',
    };
  }

  async getOrders(_params?: GetOrdersParams): Promise<Order[]> {
    // Stage 1: No order tracking
    return [];
  }

  async getOpenOrders(_params?: GetOrdersParams): Promise<Order[]> {
    // Stage 1: No order tracking
    return [];
  }

  async getOrderFills(_params?: GetOrderFillsParams): Promise<OrderFill[]> {
    // Stage 1: No fill tracking
    return [];
  }

  async getOrFetchFills(_params?: GetOrFetchFillsParams): Promise<OrderFill[]> {
    // Stage 1: No fill tracking
    return [];
  }

  async getFunding(_params?: GetFundingParams): Promise<Funding[]> {
    // Stage 1: No funding tracking
    return [];
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
    return [];
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
    return 100; // MYX default max leverage
  }

  async calculateFees(
    _params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    // MYX fee structure (placeholder values)
    return {
      feeRate: 0.0005, // 0.05% total fee rate
      protocolFeeRate: 0.0005, // Protocol taker fee
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
    // Stage 1: No candle data - immediately call back with empty candles
    // (matches HyperLiquid pattern which calls callback after initial fetch)
    setTimeout(
      () =>
        params.callback({
          symbol: params.symbol,
          interval: params.interval,
          candles: [],
        }),
      0,
    );
    return () => {
      /* noop */
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
