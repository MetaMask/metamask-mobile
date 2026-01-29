/**
 * AggregatedPerpsProvider - Multi-provider aggregation wrapper
 *
 * Implements PerpsProvider interface to enable seamless multi-provider support.
 * Aggregates read operations from all providers, routes write operations to specific
 * providers based on params.providerId or default provider.
 *
 * Phase 1 Implementation:
 * - Read operations: Aggregate from all providers using Promise.allSettled()
 * - Write operations: Route to params.providerId ?? defaultProvider
 * - Subscriptions: Multiplex via SubscriptionMultiplexer
 * - Lifecycle: Delegate to default provider
 *
 * All returned data includes providerId field for UI differentiation.
 */

import type { CaipAccountId } from '@metamask/utils';
import type {
  AccountState,
  AggregatedProviderConfig,
  AggregationMode,
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
  GetOrFetchFillsParams,
  GetPositionsParams,
  GetSupportedPathsParams,
  HistoricalPortfolioResult,
  InitializeResult,
  PerpsPlatformDependencies,
  PerpsProvider,
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
  UpdateMarginParams,
  UpdatePositionTPSLParams,
  UserHistoryItem,
  WithdrawParams,
  WithdrawResult,
} from '../types';
import type { RawHyperLiquidLedgerUpdate } from '../../utils/hyperLiquidAdapter';
import { ProviderRouter } from '../routing/ProviderRouter';
import { SubscriptionMultiplexer } from '../aggregation/SubscriptionMultiplexer';

/**
 * AggregatedPerpsProvider implements PerpsProvider by coordinating
 * multiple backend providers.
 *
 * Design principles:
 * 1. Read operations aggregate from all providers (parallel)
 * 2. Write operations route to specific provider (explicit > default)
 * 3. Lifecycle operations delegate to default provider
 * 4. All returned data includes providerId for UI differentiation
 *
 * @example
 * ```typescript
 * const aggregated = new AggregatedPerpsProvider({
 *   providers: new Map([
 *     ['hyperliquid', hlProvider],
 *     ['myx', myxProvider],
 *   ]),
 *   defaultProvider: 'hyperliquid',
 *   infrastructure: deps,
 * });
 *
 * // Read: returns positions from all providers
 * const positions = await aggregated.getPositions();
 *
 * // Write: routes to specific or default provider
 * await aggregated.placeOrder({ symbol: 'BTC', providerId: 'myx', ... });
 * ```
 */
export class AggregatedPerpsProvider implements PerpsProvider {
  readonly protocolId = 'aggregated';

  private readonly providers: Map<PerpsProviderType, PerpsProvider>;
  private readonly defaultProvider: PerpsProviderType;
  private readonly aggregationMode: AggregationMode;
  private readonly deps: PerpsPlatformDependencies;
  private readonly router: ProviderRouter;
  private readonly subscriptionMux: SubscriptionMultiplexer;

  constructor(config: AggregatedProviderConfig) {
    this.providers = config.providers;
    this.defaultProvider = config.defaultProvider;
    this.aggregationMode = config.aggregationMode ?? 'all';
    this.deps = config.infrastructure;

    // Initialize router with default provider
    this.router = new ProviderRouter({
      defaultProvider: this.defaultProvider,
    });

    // Initialize subscription multiplexer with logger for error reporting
    this.subscriptionMux = new SubscriptionMultiplexer({
      logger: this.deps.logger,
    });

    this.deps.debugLogger.log('[AggregatedPerpsProvider] Initialized', {
      providers: Array.from(this.providers.keys()),
      defaultProvider: this.defaultProvider,
      aggregationMode: this.aggregationMode,
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Get list of active providers as tuples for iteration.
   * Returns array of [providerId, provider] pairs.
   */
  private getActiveProviders(): [PerpsProviderType, PerpsProvider][] {
    return Array.from(this.providers.entries());
  }

  /**
   * Get the default provider instance.
   * Throws if default provider is not available.
   */
  private getDefaultProvider(): PerpsProvider {
    const provider = this.providers.get(this.defaultProvider);
    if (!provider) {
      throw new Error(
        `[AggregatedPerpsProvider] Default provider '${this.defaultProvider}' not available`,
      );
    }
    return provider;
  }

  /**
   * Get provider by ID, falling back to default if not found.
   */
  private getProviderOrDefault(
    providerId?: PerpsProviderType,
  ): [PerpsProviderType, PerpsProvider] {
    const id = providerId ?? this.defaultProvider;
    const provider = this.providers.get(id);
    if (!provider) {
      this.deps.debugLogger.log(
        `[AggregatedPerpsProvider] Provider '${id}' not found, using default`,
      );
      return [this.defaultProvider, this.getDefaultProvider()];
    }
    return [id, provider];
  }

  /**
   * Extract successful results from Promise.allSettled.
   * Logs errors for failed promises.
   *
   * @param results - Results from Promise.allSettled
   * @param context - Context string for logging
   * @returns Array of successful values
   */
  private extractSuccessfulResults<TResult>(
    results: PromiseSettledResult<TResult>[],
    context: string,
  ): TResult[] {
    const successful: TResult[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        this.deps.debugLogger.log(
          `[AggregatedPerpsProvider] ${context} failed for provider ${index}`,
          { error: result.reason },
        );
      }
    });
    return successful;
  }

  // ============================================================================
  // Asset Routes (Synchronous - delegate to default provider)
  // ============================================================================

  getDepositRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    return this.getDefaultProvider().getDepositRoutes(params);
  }

  getWithdrawalRoutes(params?: GetSupportedPathsParams): AssetRoute[] {
    return this.getDefaultProvider().getWithdrawalRoutes(params);
  }

  // ============================================================================
  // Read Operations (Aggregate from all providers)
  // ============================================================================

  async getPositions(params?: GetPositionsParams): Promise<Position[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const positions = await provider.getPositions(params);
        return positions.map((pos) => ({ ...pos, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(results, 'getPositions').flat();
  }

  async getAccountState(params?: GetAccountStateParams): Promise<AccountState> {
    // Return account state from default provider with providerId injected
    const provider = this.getDefaultProvider();
    const state = await provider.getAccountState(params);
    return { ...state, providerId: this.defaultProvider };
  }

  async getMarkets(params?: GetMarketsParams): Promise<MarketInfo[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const markets = await provider.getMarkets(params);
        return markets.map((market) => ({ ...market, providerId: id }));
      }),
    );

    const allMarkets = this.extractSuccessfulResults(
      results,
      'getMarkets',
    ).flat();

    // Deduplicate markets by name (keep first occurrence)
    const seen = new Set<string>();
    return allMarkets.filter((market) => {
      // Use providerId:name as unique key to allow same market from different providers
      const key = `${market.providerId}:${market.name}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  async getMarketDataWithPrices(): Promise<PerpsMarketData[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const data = await provider.getMarketDataWithPrices();
        return data.map((item) => ({ ...item, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(
      results,
      'getMarketDataWithPrices',
    ).flat();
  }

  async getOrderFills(params?: GetOrderFillsParams): Promise<OrderFill[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const fills = await provider.getOrderFills(params);
        return fills.map((fill) => ({ ...fill, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(results, 'getOrderFills').flat();
  }

  async getOrFetchFills(params?: GetOrFetchFillsParams): Promise<OrderFill[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const fills = await provider.getOrFetchFills(params);
        return fills.map((fill) => ({ ...fill, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(results, 'getOrFetchFills').flat();
  }

  async getOrders(params?: GetOrdersParams): Promise<Order[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const orders = await provider.getOrders(params);
        return orders.map((order) => ({ ...order, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(results, 'getOrders').flat();
  }

  async getOpenOrders(params?: GetOrdersParams): Promise<Order[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const orders = await provider.getOpenOrders(params);
        return orders.map((order) => ({ ...order, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(results, 'getOpenOrders').flat();
  }

  async getFunding(params?: GetFundingParams): Promise<Funding[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([_providerId, provider]) => {
        const funding = await provider.getFunding(params);
        // Funding type doesn't have providerId - we could add it if needed
        return funding;
      }),
    );

    return this.extractSuccessfulResults(results, 'getFunding').flat();
  }

  async getHistoricalPortfolio(
    params?: GetHistoricalPortfolioParams,
  ): Promise<HistoricalPortfolioResult> {
    // Delegate to default provider
    return this.getDefaultProvider().getHistoricalPortfolio(params);
  }

  /**
   * Get user non-funding ledger updates from default provider.
   *
   * @param params - Optional parameters
   * @param params.accountId - Account ID to filter by
   * @param params.startTime - Start time filter
   * @param params.endTime - End time filter
   * @returns Raw ledger updates
   */
  async getUserNonFundingLedgerUpdates(params?: {
    accountId?: string;
    startTime?: number;
    endTime?: number;
  }): Promise<RawHyperLiquidLedgerUpdate[]> {
    // Delegate to default provider (protocol-specific)
    return this.getDefaultProvider().getUserNonFundingLedgerUpdates(params);
  }

  /**
   * Get user history from all providers.
   *
   * @param params - Optional parameters
   * @param params.accountId - Account ID to filter by
   * @param params.startTime - Start time filter
   * @param params.endTime - End time filter
   * @returns Aggregated user history with providerId
   */
  async getUserHistory(params?: {
    accountId?: CaipAccountId;
    startTime?: number;
    endTime?: number;
  }): Promise<UserHistoryItem[]> {
    const results = await Promise.allSettled(
      this.getActiveProviders().map(async ([id, provider]) => {
        const history = await provider.getUserHistory(params);
        return history.map((item) => ({ ...item, providerId: id }));
      }),
    );

    return this.extractSuccessfulResults(results, 'getUserHistory').flat();
  }

  // ============================================================================
  // Write Operations (Route to specific provider)
  // ============================================================================

  async placeOrder(params: OrderParams): Promise<OrderResult> {
    const [providerId, provider] = this.getProviderOrDefault(params.providerId);

    this.deps.debugLogger.log('[AggregatedPerpsProvider] placeOrder routing', {
      requestedProvider: params.providerId,
      actualProvider: providerId,
      symbol: params.symbol,
    });

    const result = await provider.placeOrder(params);
    return { ...result, providerId };
  }

  async editOrder(params: EditOrderParams): Promise<OrderResult> {
    // EditOrderParams contains OrderParams in newOrder which may have providerId
    const [providerId, provider] = this.getProviderOrDefault(
      params.newOrder.providerId,
    );
    const result = await provider.editOrder(params);
    return { ...result, providerId };
  }

  async cancelOrder(params: CancelOrderParams): Promise<CancelOrderResult> {
    const [providerId, provider] = this.getProviderOrDefault(params.providerId);
    const result = await provider.cancelOrder(params);
    return { ...result, providerId };
  }

  async cancelOrders(
    params: BatchCancelOrdersParams,
  ): Promise<CancelOrdersResult> {
    // Batch cancel delegates to default provider
    const provider = this.getDefaultProvider();
    if (!provider.cancelOrders) {
      return {
        success: false,
        successCount: 0,
        failureCount: params.length,
        results: params.map((param) => ({
          orderId: param.orderId,
          symbol: param.symbol,
          success: false,
          error: 'Batch cancel not supported',
        })),
      };
    }
    return provider.cancelOrders(params);
  }

  async closePosition(params: ClosePositionParams): Promise<OrderResult> {
    const [providerId, provider] = this.getProviderOrDefault(params.providerId);
    const result = await provider.closePosition(params);
    return { ...result, providerId };
  }

  async closePositions(
    params: ClosePositionsParams,
  ): Promise<ClosePositionsResult> {
    // Batch close delegates to default provider
    const provider = this.getDefaultProvider();
    if (!provider.closePositions) {
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
    const [providerId, provider] = this.getProviderOrDefault(params.providerId);
    const result = await provider.updatePositionTPSL(params);
    return { ...result, providerId };
  }

  async updateMargin(params: UpdateMarginParams): Promise<MarginResult> {
    const [, provider] = this.getProviderOrDefault(params.providerId);
    return provider.updateMargin(params);
  }

  async withdraw(params: WithdrawParams): Promise<WithdrawResult> {
    const [, provider] = this.getProviderOrDefault(params.providerId);
    return provider.withdraw(params);
  }

  // ============================================================================
  // Validation (Route to specific provider)
  // ============================================================================

  async validateDeposit(
    params: DepositParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    return this.getDefaultProvider().validateDeposit(params);
  }

  async validateOrder(
    params: OrderParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const [, provider] = this.getProviderOrDefault(params.providerId);
    return provider.validateOrder(params);
  }

  async validateClosePosition(
    params: ClosePositionParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const [, provider] = this.getProviderOrDefault(params.providerId);
    return provider.validateClosePosition(params);
  }

  async validateWithdrawal(
    params: WithdrawParams,
  ): Promise<{ isValid: boolean; error?: string }> {
    const [, provider] = this.getProviderOrDefault(params.providerId);
    return provider.validateWithdrawal(params);
  }

  // ============================================================================
  // Protocol Calculations (Delegate to default or route)
  // ============================================================================

  async calculateLiquidationPrice(
    params: LiquidationPriceParams,
  ): Promise<string> {
    return this.getDefaultProvider().calculateLiquidationPrice(params);
  }

  async calculateMaintenanceMargin(
    params: MaintenanceMarginParams,
  ): Promise<number> {
    return this.getDefaultProvider().calculateMaintenanceMargin(params);
  }

  async getMaxLeverage(asset: string): Promise<number> {
    return this.getDefaultProvider().getMaxLeverage(asset);
  }

  async calculateFees(
    params: FeeCalculationParams,
  ): Promise<FeeCalculationResult> {
    return this.getDefaultProvider().calculateFees(params);
  }

  // ============================================================================
  // Subscriptions (Multiplex via SubscriptionMultiplexer)
  // ============================================================================

  subscribeToPrices(params: SubscribePricesParams): () => void {
    return this.subscriptionMux.subscribeToPrices({
      ...params,
      providers: this.getActiveProviders(),
      aggregationMode: 'merge',
    });
  }

  subscribeToPositions(params: SubscribePositionsParams): () => void {
    return this.subscriptionMux.subscribeToPositions({
      ...params,
      providers: this.getActiveProviders(),
    });
  }

  subscribeToOrderFills(params: SubscribeOrderFillsParams): () => void {
    return this.subscriptionMux.subscribeToOrderFills({
      ...params,
      providers: this.getActiveProviders(),
    });
  }

  subscribeToOrders(params: SubscribeOrdersParams): () => void {
    return this.subscriptionMux.subscribeToOrders({
      ...params,
      providers: this.getActiveProviders(),
    });
  }

  subscribeToAccount(params: SubscribeAccountParams): () => void {
    // For account subscriptions, we emit as array for multi-provider
    // but the callback expects single AccountState
    // Delegate to default provider for now
    return this.getDefaultProvider().subscribeToAccount(params);
  }

  subscribeToOICaps(params: SubscribeOICapsParams): () => void {
    // Delegate to default provider
    return this.getDefaultProvider().subscribeToOICaps(params);
  }

  subscribeToCandles(params: SubscribeCandlesParams): () => void {
    // Delegate to default provider
    return this.getDefaultProvider().subscribeToCandles(params);
  }

  subscribeToOrderBook(params: SubscribeOrderBookParams): () => void {
    // Delegate to default provider
    return this.getDefaultProvider().subscribeToOrderBook(params);
  }

  // ============================================================================
  // Configuration
  // ============================================================================

  setLiveDataConfig(config: Partial<LiveDataConfig>): void {
    // Apply config to all providers
    this.providers.forEach((provider) => {
      provider.setLiveDataConfig(config);
    });
  }

  setUserFeeDiscount(discountBips: number | undefined): void {
    // Apply to all providers that support it
    this.providers.forEach((provider) => {
      if (provider.setUserFeeDiscount) {
        provider.setUserFeeDiscount(discountBips);
      }
    });
  }

  // ============================================================================
  // Lifecycle (Delegate to default provider)
  // ============================================================================

  async toggleTestnet(): Promise<ToggleTestnetResult> {
    return this.getDefaultProvider().toggleTestnet();
  }

  async initialize(): Promise<InitializeResult> {
    // Initialize default provider
    const result = await this.getDefaultProvider().initialize();

    // Optionally initialize other providers in background
    // For Phase 1, we only initialize default provider
    return result;
  }

  async isReadyToTrade(): Promise<ReadyToTradeResult> {
    return this.getDefaultProvider().isReadyToTrade();
  }

  async disconnect(): Promise<DisconnectResult> {
    // Disconnect all providers
    const results = await Promise.allSettled(
      this.getActiveProviders().map(([, provider]) => provider.disconnect()),
    );

    // Clear subscription cache
    this.subscriptionMux.clearCache();

    // Return success if at least one succeeded
    const successCount = results.filter(
      (res) => res.status === 'fulfilled' && res.value.success,
    ).length;

    return {
      success: successCount > 0,
    };
  }

  async ping(timeoutMs?: number): Promise<void> {
    return this.getDefaultProvider().ping(timeoutMs);
  }

  // ============================================================================
  // Block Explorer
  // ============================================================================

  getBlockExplorerUrl(address?: string): string {
    return this.getDefaultProvider().getBlockExplorerUrl(address);
  }

  // ============================================================================
  // HIP-3 (Optional)
  // ============================================================================

  async getAvailableDexs(params?: GetAvailableDexsParams): Promise<string[]> {
    const provider = this.getDefaultProvider();
    if (!provider.getAvailableDexs) {
      return [];
    }
    return provider.getAvailableDexs(params);
  }

  // ============================================================================
  // Provider Management
  // ============================================================================

  /**
   * Add a new provider to the aggregated provider.
   *
   * @param providerId - Unique identifier for the provider
   * @param provider - Provider instance
   */
  addProvider(providerId: PerpsProviderType, provider: PerpsProvider): void {
    this.providers.set(providerId, provider);
    this.deps.debugLogger.log('[AggregatedPerpsProvider] Provider added', {
      providerId,
    });
  }

  /**
   * Remove a provider from the aggregated provider.
   *
   * @param providerId - Provider to remove
   * @returns true if removed, false if not found
   */
  removeProvider(providerId: PerpsProviderType): boolean {
    const removed = this.providers.delete(providerId);
    if (removed) {
      this.deps.debugLogger.log('[AggregatedPerpsProvider] Provider removed', {
        providerId,
      });
    }
    return removed;
  }

  /**
   * Get list of all registered provider IDs.
   */
  getProviderIds(): PerpsProviderType[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Check if a provider is registered.
   */
  hasProvider(providerId: PerpsProviderType): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Get the router instance for external configuration.
   */
  getRouter(): ProviderRouter {
    return this.router;
  }
}
