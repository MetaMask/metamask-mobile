import type { CaipAccountId } from '@metamask/utils';
import type {
  AccountState,
  AggregatedProviderConfig,
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
  GetAvailableDexsParams,
  GetFundingParams,
  GetHistoricalPortfolioParams,
  GetMarketsParams,
  GetOrderFillsParams,
  GetOrdersParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  HistoricalPortfolioResult,
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
  PerpsProviderType,
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
  UserHistoryItem,
  WithdrawParams,
  WithdrawResult,
} from '../types';
import type { RawHyperLiquidLedgerUpdate } from '../../utils/hyperLiquidAdapter';
import { SubscriptionMultiplexer } from '../aggregation/SubscriptionMultiplexer';

/**
 * AggregatedPerpsProvider implements IPerpsProvider and wraps multiple
 * underlying providers to enable multi-provider support.
 *
 * Phase 1 scope (simplified):
 * - Display available markets from each provider (tagged with providerId)
 * - Place orders on a user-selected provider (explicit providerId in params)
 *
 * Design Principles:
 * 1. Read operations aggregate data from all active providers
 * 2. Write operations use providerId from params (attached to market data) or defaultProvider
 * 3. Subscriptions multiplex across providers via SubscriptionMultiplexer
 * 4. All returned data includes providerId for UI differentiation
 *
 * This wrapper pattern enables PerpsController to work unchanged while
 * gaining multi-provider capabilities.
 */
export class AggregatedPerpsProvider implements IPerpsProvider {
  readonly protocolId = 'aggregated';

  private providers: Map<PerpsProviderType, IPerpsProvider> = new Map();
  private subscriptionMux: SubscriptionMultiplexer;
  private defaultProvider: PerpsProviderType;

  constructor(config: Partial<AggregatedProviderConfig> = {}) {
    this.defaultProvider = config.defaultProvider ?? 'hyperliquid';
    this.subscriptionMux = new SubscriptionMultiplexer();

    // Register initial providers if provided
    if (config.providers) {
      config.providers.forEach((provider, id) => {
        this.registerProvider(id, provider);
      });
    }
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  /**
   * Register a provider for aggregation
   */
  registerProvider(id: PerpsProviderType, provider: IPerpsProvider): void {
    this.providers.set(id, provider);
  }

  /**
   * Unregister a provider
   */
  unregisterProvider(id: PerpsProviderType): void {
    this.providers.delete(id);
  }

  /**
   * Get a specific provider by ID
   */
  getProvider(id: PerpsProviderType): IPerpsProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Get all active providers as [id, provider] tuples
   */
  getActiveProviders(): [PerpsProviderType, IPerpsProvider][] {
    return Array.from(this.providers.entries());
  }

  /**
   * Get all registered provider IDs
   */
  getRegisteredProviderIds(): PerpsProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Set the default provider for write operations
   */
  setDefaultProvider(id: PerpsProviderType): void {
    this.defaultProvider = id;
  }

  /**
   * Get the current default provider
   */
  getDefaultProvider(): PerpsProviderType {
    return this.defaultProvider;
  }

  // ============================================================================
  // Read Operations - Aggregate across providers
  // ============================================================================

  async getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        try {
          const markets = await provider.getMarkets(params);
          return markets.map((m) => ({ ...m, providerId: id }));
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([_id, provider]) => {
        try {
          return await provider.getMarketDataWithPrices();
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        try {
          const positions = await provider.getPositions(params);
          return positions.map((p) => ({ ...p, providerId: id }));
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    // For Phase 1, return account state from default provider
    // Future: Aggregate balances across all providers
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider ${this.defaultProvider} not available`);
    }
    const state = await provider.getAccountState(params);
    return { ...state, providerId: this.defaultProvider };
  }

  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        try {
          const orders = await provider.getOrders(params);
          return orders.map((o) => ({ ...o, providerId: id }));
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        try {
          const orders = await provider.getOpenOrders(params);
          return orders.map((o) => ({ ...o, providerId: id }));
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        try {
          const fills = await provider.getOrderFills(params);
          return fills.map((f) => ({ ...f, providerId: id }));
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([_id, provider]) => {
        try {
          return await provider.getFunding(params);
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    // Return from default provider
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider ${this.defaultProvider} not available`);
    }
    return provider.getHistoricalPortfolio(params);
  }

  async getUserNonFundingLedgerUpdates(params?: {
    accountId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<RawHyperLiquidLedgerUpdate[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([_id, provider]) => {
        try {
          return await provider.getUserNonFundingLedgerUpdates(params);
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  async getUserHistory(params?: {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
  }): Promise<UserHistoryItem[]> {
    const results = await Promise.all(
      this.getActiveProviders().map(async ([_id, provider]) => {
        try {
          return await provider.getUserHistory(params);
        } catch {
          return [];
        }
      }),
    );
    return results.flat();
  }

  // ============================================================================
  // Write Operations - Route to specific provider
  // ============================================================================

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    const result = await provider.placeOrder(params);
    return { ...result, providerId };
  }

  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    const providerId = params.newOrder.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    const result = await provider.editOrder(params);
    return { ...result, providerId };
  }

  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    // For cancel, providerId should be explicitly provided or use default
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    return provider.cancelOrder(params);
  }

  async cancelOrders?(
    params: BatchCancelOrdersParams,
  ): Promise<CancelOrdersResult> {
    // Group orders by provider and cancel in batch per provider
    // For Phase 1, route all to default provider
    const provider = this.providers.get(this.defaultProvider);
    if (!provider?.cancelOrders) {
      return {
        success: false,
        successCount: 0,
        failureCount: params.length,
        results: params.map((p) => ({
          orderId: p.orderId,
          coin: p.coin,
          success: false,
          error: 'Batch cancel not supported',
        })),
      };
    }
    return provider.cancelOrders(params);
  }

  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    const result = await provider.closePosition(params);
    return { ...result, providerId };
  }

  async closePositions?(
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    // For Phase 1, route to default provider
    const provider = this.providers.get(this.defaultProvider);
    if (!provider?.closePositions) {
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
        results: [],
      };
    }
    return provider.closePositions(params);
  }

  async updatePositionTPSL(
    params: UpdatePositionTPSLParams,
  ): Promise<OrderResult> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    const result = await provider.updatePositionTPSL(params);
    return { ...result, providerId };
  }

  async updateMargin(params: {
    coin: string;
    amount: string;
    providerId?: PerpsProviderType;
  }): Promise<MarginResult> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { success: false, error: `Provider ${providerId} not available` };
    }
    return provider.updateMargin(params);
  }

  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    // Withdraw from default provider
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      return {
        success: false,
        error: `Default provider ${this.defaultProvider} not available`,
      };
    }
    return provider.withdraw(params);
  }

  // ============================================================================
  // Validation - Route to specific provider
  // ============================================================================

  async validateDeposit(
    params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      return {
        isValid: false,
        error: `Default provider ${this.defaultProvider} not available`,
      };
    }
    return provider.validateDeposit(params);
  }

  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { isValid: false, error: `Provider ${providerId} not available` };
    }
    return provider.validateOrder(params);
  }

  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return { isValid: false, error: `Provider ${providerId} not available` };
    }
    return provider.validateClosePosition(params);
  }

  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      return {
        isValid: false,
        error: `Default provider ${this.defaultProvider} not available`,
      };
    }
    return provider.validateWithdrawal(params);
  }

  // ============================================================================
  // Routes - Aggregate across providers
  // ============================================================================

  getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    const routes: AssetRoute[] = [];
    this.getActiveProviders().forEach(([_id, provider]) => {
      try {
        routes.push(...provider.getDepositRoutes(params));
      } catch {
        // Ignore errors
      }
    });
    return routes;
  }

  getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    const routes: AssetRoute[] = [];
    this.getActiveProviders().forEach(([_id, provider]) => {
      try {
        routes.push(...provider.getWithdrawalRoutes(params));
      } catch {
        // Ignore errors
      }
    });
    return routes;
  }

  // ============================================================================
  // Calculations - Route to specific provider
  // ============================================================================

  async calculateLiquidationPrice(
    params: LiquidationPriceParams & { providerId?: PerpsProviderType },
  ): Promise<string> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not available`);
    }
    return provider.calculateLiquidationPrice(params);
  }

  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams & { providerId?: PerpsProviderType },
  ): Promise<number> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new Error(`Provider ${providerId} not available`);
    }
    return provider.calculateMaintenanceMargin(params);
  }

  async getMaxLeverage(
    asset: string,
    providerId?: PerpsProviderType,
  ): Promise<number> {
    const resolvedProviderId = providerId ?? this.defaultProvider;
    const provider = this.providers.get(resolvedProviderId);
    if (!provider) {
      throw new Error(`Provider ${resolvedProviderId} not available`);
    }
    return provider.getMaxLeverage(asset);
  }

  async calculateFees(
    params: FeeCalculationParams & { providerId?: PerpsProviderType },
  ): Promise<FeeCalculationResult> {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      return {};
    }
    return provider.calculateFees(params);
  }

  // ============================================================================
  // Subscriptions - Multiplex across providers
  // ============================================================================

  subscribeToPrices(params: SubscribePricesParams): () => void {
    return this.subscriptionMux.subscribeToPrices(
      params,
      this.getActiveProviders(),
    );
  }

  subscribeToPositions(params: SubscribePositionsParams): () => void {
    return this.subscriptionMux.subscribeToPositions(
      params,
      this.getActiveProviders(),
    );
  }

  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    return this.subscriptionMux.subscribeToOrderFills(
      params,
      this.getActiveProviders(),
    );
  }

  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    return this.subscriptionMux.subscribeToOrders(
      params,
      this.getActiveProviders(),
    );
  }

  subscribeToAccount(params: SubscribeAccountParams): () => void {
    return this.subscriptionMux.subscribeToAccount(
      params,
      this.getActiveProviders(),
    );
  }

  subscribeToOICaps(params: SubscribeOICapsParams): () => void {
    // Route to default provider (OI caps are provider-specific)
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      // No-op unsubscribe when provider not available
      // eslint-disable-next-line no-empty-function
      return () => {};
    }
    return provider.subscribeToOICaps(params);
  }

  subscribeToCandles(params: SubscribeCandlesParams): () => void {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      // eslint-disable-next-line no-empty-function
      return () => {};
    }
    return provider.subscribeToCandles(params);
  }

  subscribeToOrderBook(params: SubscribeOrderBookParams): () => void {
    const providerId = params.providerId ?? this.defaultProvider;
    const provider = this.providers.get(providerId);
    if (!provider) {
      // eslint-disable-next-line no-empty-function
      return () => {};
    }
    return provider.subscribeToOrderBook(params);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    // Apply to all providers
    this.getActiveProviders().forEach(([_id, provider]) => {
      provider.setLiveDataConfig(config);
    });
  }

  setUserFeeDiscount?(discountBips: number | undefined): void {
    // Apply to all providers that support it
    this.getActiveProviders().forEach(([_id, provider]) => {
      if (provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(discountBips);
      }
    });
  }

  // ============================================================================
  // Connection Management
  // ============================================================================

  async toggleTestnet(): Promise<ToggleTestnetResult> {
    // Toggle on default provider (testnet mode is global)
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      return {
        success: false,
        isTestnet: false,
        error: `Default provider ${this.defaultProvider} not available`,
      };
    }
    return provider.toggleTestnet();
  }

  async initialize(): Promise<InitializeResult> {
    // Initialize all providers in parallel
    const results = await Promise.all(
      this.getActiveProviders().map(async ([id, provider]) => {
        try {
          const result = await provider.initialize();
          return { id, result };
        } catch (error) {
          return {
            id,
            result: {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
          };
        }
      }),
    );

    // Return success if at least one provider initialized
    const anySuccess = results.some((r) => r.result.success);
    const firstSuccess = results.find((r) => r.result.success);

    return {
      success: anySuccess,
      chainId: firstSuccess?.result.chainId,
      error: anySuccess
        ? undefined
        : results.map((r) => `${r.id}: ${r.result.error}`).join('; '),
    };
  }

  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    // Check if default provider is ready
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      return {
        ready: false,
        error: `Default provider ${this.defaultProvider} not available`,
      };
    }
    return provider.isReadyToTrade();
  }

  async disconnect(): Promise<DisconnectResult> {
    // Disconnect all providers
    const results = await Promise.all(
      this.getActiveProviders().map(async ([_id, provider]) => {
        try {
          return await provider.disconnect();
        } catch {
          return { success: false };
        }
      }),
    );

    return {
      success: results.every((r) => r.success),
    };
  }

  async ping(timeoutMs?: number): Promise<void> {
    // Ping default provider
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(`Default provider ${this.defaultProvider} not available`);
    }
    return provider.ping(timeoutMs);
  }

  getBlockExplorerUrl(address?: string): string {
    // Return URL from default provider
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      return '';
    }
    return provider.getBlockExplorerUrl(address);
  }

  // ============================================================================
  // HIP-3 Operations (optional)
  // ============================================================================

  async getAvailableDexs?(params?: GetAvailableDexsParams): Promise<string[]> {
    // Aggregate DEXs from all providers that support this
    const dexs: string[] = [];
    for (const [, provider] of this.getActiveProviders()) {
      if (provider.getAvailableDexs) {
        try {
          const providerDexs = await provider.getAvailableDexs(params);
          dexs.push(...providerDexs);
        } catch {
          // Ignore errors
        }
      }
    }
    return dexs;
  }
}
