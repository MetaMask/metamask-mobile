/**
 * SubscriptionMultiplexer - Manages WebSocket subscriptions across multiple providers
 *
 * Responsibilities:
 * - Manage subscriptions to multiple providers simultaneously
 * - Tag all updates with providerId so UI can differentiate sources
 * - Support aggregation modes: 'merge' (all prices) or 'best_price' (best price per symbol)
 * - Cache latest updates per provider per symbol for aggregation
 */

import type {
  PerpsProviderType,
  PerpsProvider,
  PerpsLogger,
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
} from '../types';
import { ensureError } from '../../../../../util/errorUtils';
import { PERPS_CONSTANTS } from '../../constants/perpsConfig';

/**
 * Options for constructing SubscriptionMultiplexer
 */
export interface SubscriptionMultiplexerOptions {
  /** Optional logger for error reporting (e.g., Sentry) */
  logger?: PerpsLogger;
}

/**
 * Aggregation mode for price subscriptions
 */
export type PriceAggregationMode = 'merge' | 'best_price';

/**
 * Parameters for multiplexed price subscriptions
 */
export interface MultiplexedPricesParams {
  /** Symbols to subscribe to */
  symbols: string[];
  /** Provider instances to subscribe through */
  providers: [PerpsProviderType, PerpsProvider][];
  /** Callback to receive aggregated price updates */
  callback: (prices: PriceUpdate[]) => void;
  /** Aggregation mode: 'merge' returns all prices, 'best_price' returns best per symbol */
  aggregationMode?: PriceAggregationMode;
  /** Optional throttle in milliseconds */
  throttleMs?: number;
  /** Include order book data */
  includeOrderBook?: boolean;
  /** Include market data (funding, OI, volume) */
  includeMarketData?: boolean;
}

/**
 * Parameters for multiplexed position subscriptions
 */
export interface MultiplexedPositionsParams {
  /** Provider instances to subscribe through */
  providers: [PerpsProviderType, PerpsProvider][];
  /** Callback to receive aggregated position updates */
  callback: (positions: Position[]) => void;
}

/**
 * Parameters for multiplexed order fill subscriptions
 */
export interface MultiplexedOrderFillsParams {
  /** Provider instances to subscribe through */
  providers: [PerpsProviderType, PerpsProvider][];
  /** Callback to receive aggregated order fill updates */
  callback: (fills: OrderFill[], isSnapshot?: boolean) => void;
}

/**
 * Parameters for multiplexed order subscriptions
 */
export interface MultiplexedOrdersParams {
  /** Provider instances to subscribe through */
  providers: [PerpsProviderType, PerpsProvider][];
  /** Callback to receive aggregated order updates */
  callback: (orders: Order[]) => void;
}

/**
 * Parameters for multiplexed account subscriptions
 */
export interface MultiplexedAccountParams {
  /** Provider instances to subscribe through */
  providers: [PerpsProviderType, PerpsProvider][];
  /** Callback to receive account updates (one per provider) */
  callback: (accounts: AccountState[]) => void;
}

/**
 * SubscriptionMultiplexer manages real-time data subscriptions across
 * multiple perps providers.
 *
 * Key features:
 * - Subscribes to all providers simultaneously
 * - Tags all updates with source providerId
 * - Caches latest values for aggregation
 * - Supports different aggregation modes for prices
 *
 * @example
 * ```typescript
 * const mux = new SubscriptionMultiplexer();
 *
 * const unsubscribe = mux.subscribeToPrices({
 *   symbols: ['BTC', 'ETH'],
 *   providers: [
 *     ['hyperliquid', hlProvider],
 *     ['myx', myxProvider],
 *   ],
 *   callback: (prices) => {
 *     // prices have providerId injected
 *     prices.forEach(p => console.log(`${p.providerId}: ${p.symbol} = ${p.price}`));
 *   },
 *   aggregationMode: 'merge',
 * });
 *
 * // Later: clean up
 * unsubscribe();
 * ```
 */
export class SubscriptionMultiplexer {
  /**
   * Optional logger for error reporting
   */
  private readonly logger?: PerpsLogger;

  /**
   * Cache of latest prices per symbol per provider
   * Map<symbol, Map<providerId, PriceUpdate>>
   */
  private readonly priceCache: Map<
    string,
    Map<PerpsProviderType, PriceUpdate>
  > = new Map();

  /**
   * Cache of latest positions per provider
   * Map<providerId, Position[]>
   */
  private readonly positionCache: Map<PerpsProviderType, Position[]> =
    new Map();

  /**
   * Cache of latest orders per provider
   * Map<providerId, Order[]>
   */
  private readonly orderCache: Map<PerpsProviderType, Order[]> = new Map();

  /**
   * Cache of latest account state per provider
   * Map<providerId, AccountState>
   */
  private readonly accountCache: Map<PerpsProviderType, AccountState> =
    new Map();

  /**
   * Create a new SubscriptionMultiplexer.
   *
   * @param options - Optional configuration including logger for error reporting
   */
  constructor(options?: SubscriptionMultiplexerOptions) {
    this.logger = options?.logger;
  }

  /**
   * Subscribe to price updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @returns Unsubscribe function
   */
  subscribeToPrices(params: MultiplexedPricesParams): () => void {
    const {
      symbols,
      providers,
      callback,
      aggregationMode = 'merge',
      throttleMs,
      includeOrderBook,
      includeMarketData,
    } = params;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to each provider with defensive error handling
    for (const [providerId, provider] of providers) {
      try {
        const subscribeParams: SubscribePricesParams = {
          symbols,
          callback: (updates) => {
            // Tag and cache each update
            updates.forEach((update) => {
              const taggedUpdate: PriceUpdate = { ...update, providerId };

              // Initialize symbol cache if needed
              if (!this.priceCache.has(update.symbol)) {
                this.priceCache.set(update.symbol, new Map());
              }
              const symbolCache = this.priceCache.get(update.symbol);
              if (symbolCache) {
                symbolCache.set(providerId, taggedUpdate);
              }
            });

            // Aggregate and emit based on mode
            const aggregated = this.aggregatePrices(symbols, aggregationMode);
            callback(aggregated);
          },
          throttleMs,
          includeOrderBook,
          includeMarketData,
        };

        const unsub = provider.subscribeToPrices(subscribeParams);
        unsubscribers.push(unsub);
      } catch (error) {
        // Log to Sentry before cleanup
        this.logger?.error(ensureError(error), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            provider: providerId,
            method: 'subscribeToPrices',
          },
          context: {
            name: 'SubscriptionMultiplexer',
            data: { subscribedCount: unsubscribers.length },
          },
        });

        // Clean up any subscriptions created before the failure
        unsubscribers.forEach((unsub) => unsub());
        throw error;
      }
    }

    // Return combined unsubscribe function
    return () => {
      unsubscribers.forEach((unsub) => unsub());
      // Optionally clear cache for these symbols
      symbols.forEach((symbol) => {
        this.priceCache.delete(symbol);
      });
    };
  }

  /**
   * Subscribe to position updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @returns Unsubscribe function
   */
  subscribeToPositions(params: MultiplexedPositionsParams): () => void {
    const { providers, callback } = params;
    const unsubscribers: (() => void)[] = [];

    for (const [providerId, provider] of providers) {
      try {
        const subscribeParams: SubscribePositionsParams = {
          callback: (positions) => {
            // Tag positions with providerId and cache
            const taggedPositions = positions.map((pos) => ({
              ...pos,
              providerId,
            }));
            this.positionCache.set(providerId, taggedPositions);

            // Emit aggregated positions from all providers
            const allPositions = this.aggregatePositions();
            callback(allPositions);
          },
        };

        const unsub = provider.subscribeToPositions(subscribeParams);
        unsubscribers.push(unsub);
      } catch (error) {
        this.logger?.error(ensureError(error), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            provider: providerId,
            method: 'subscribeToPositions',
          },
          context: {
            name: 'SubscriptionMultiplexer',
            data: { subscribedCount: unsubscribers.length },
          },
        });
        unsubscribers.forEach((unsub) => unsub());
        throw error;
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      // Clear position cache for these providers
      providers.forEach(([providerId]) => {
        this.positionCache.delete(providerId);
      });
    };
  }

  /**
   * Subscribe to order fill updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @returns Unsubscribe function
   */
  subscribeToOrderFills(params: MultiplexedOrderFillsParams): () => void {
    const { providers, callback } = params;
    const unsubscribers: (() => void)[] = [];

    for (const [providerId, provider] of providers) {
      try {
        const subscribeParams: SubscribeOrderFillsParams = {
          callback: (fills, isSnapshot) => {
            // Tag fills with providerId
            const taggedFills = fills.map((fill) => ({
              ...fill,
              providerId,
            }));

            // For fills, we don't aggregate - emit immediately with tags
            callback(taggedFills, isSnapshot);
          },
        };

        const unsub = provider.subscribeToOrderFills(subscribeParams);
        unsubscribers.push(unsub);
      } catch (error) {
        this.logger?.error(ensureError(error), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            provider: providerId,
            method: 'subscribeToOrderFills',
          },
          context: {
            name: 'SubscriptionMultiplexer',
            data: { subscribedCount: unsubscribers.length },
          },
        });
        unsubscribers.forEach((unsub) => unsub());
        throw error;
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }

  /**
   * Subscribe to order updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @returns Unsubscribe function
   */
  subscribeToOrders(params: MultiplexedOrdersParams): () => void {
    const { providers, callback } = params;
    const unsubscribers: (() => void)[] = [];

    for (const [providerId, provider] of providers) {
      try {
        const subscribeParams: SubscribeOrdersParams = {
          callback: (orders) => {
            // Tag orders with providerId and cache
            const taggedOrders = orders.map((order) => ({
              ...order,
              providerId,
            }));
            this.orderCache.set(providerId, taggedOrders);

            // Emit aggregated orders from all providers
            const allOrders = this.aggregateOrders();
            callback(allOrders);
          },
        };

        const unsub = provider.subscribeToOrders(subscribeParams);
        unsubscribers.push(unsub);
      } catch (error) {
        this.logger?.error(ensureError(error), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            provider: providerId,
            method: 'subscribeToOrders',
          },
          context: {
            name: 'SubscriptionMultiplexer',
            data: { subscribedCount: unsubscribers.length },
          },
        });
        unsubscribers.forEach((unsub) => unsub());
        throw error;
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      providers.forEach(([providerId]) => {
        this.orderCache.delete(providerId);
      });
    };
  }

  /**
   * Subscribe to account updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @returns Unsubscribe function
   */
  subscribeToAccount(params: MultiplexedAccountParams): () => void {
    const { providers, callback } = params;
    const unsubscribers: (() => void)[] = [];

    for (const [providerId, provider] of providers) {
      try {
        const subscribeParams: SubscribeAccountParams = {
          callback: (account) => {
            if (account === null) {
              this.accountCache.delete(providerId);
            } else {
              // Tag account with providerId and cache
              const taggedAccount: AccountState = {
                ...account,
                providerId,
              };
              this.accountCache.set(providerId, taggedAccount);
            }

            // Emit all cached account states
            const allAccounts = Array.from(this.accountCache.values());
            callback(allAccounts);
          },
        };

        const unsub = provider.subscribeToAccount(subscribeParams);
        unsubscribers.push(unsub);
      } catch (error) {
        this.logger?.error(ensureError(error), {
          tags: {
            feature: PERPS_CONSTANTS.FeatureName,
            provider: providerId,
            method: 'subscribeToAccount',
          },
          context: {
            name: 'SubscriptionMultiplexer',
            data: { subscribedCount: unsubscribers.length },
          },
        });
        unsubscribers.forEach((unsub) => unsub());
        throw error;
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
      providers.forEach(([providerId]) => {
        this.accountCache.delete(providerId);
      });
    };
  }

  /**
   * Aggregate cached prices based on mode.
   *
   * @param symbols - Symbols to include in result
   * @param mode - Aggregation mode
   * @returns Aggregated price updates
   */
  private aggregatePrices(
    symbols: string[],
    mode: PriceAggregationMode,
  ): PriceUpdate[] {
    const result: PriceUpdate[] = [];

    symbols.forEach((symbol) => {
      const providerPrices = this.priceCache.get(symbol);
      if (!providerPrices || providerPrices.size === 0) {
        return;
      }

      if (mode === 'merge') {
        // Return all prices (one per provider)
        providerPrices.forEach((price) => {
          result.push(price);
        });
      } else {
        // 'best_price': Return the best price across providers
        const best = this.findBestPrice(providerPrices);
        if (best) {
          result.push(best);
        }
      }
    });

    return result;
  }

  /**
   * Find the best price from multiple provider prices.
   * "Best" is defined as the price with the smallest spread.
   *
   * @param providerPrices - Map of provider prices for a symbol
   * @returns Best price update or undefined
   */
  private findBestPrice(
    providerPrices: Map<PerpsProviderType, PriceUpdate>,
  ): PriceUpdate | undefined {
    let bestPrice: PriceUpdate | undefined;
    let smallestSpread = Infinity;

    providerPrices.forEach((price) => {
      // If spread is available, use it to determine best
      if (price.spread !== undefined) {
        const spreadValue = parseFloat(price.spread);
        if (!isNaN(spreadValue) && spreadValue < smallestSpread) {
          smallestSpread = spreadValue;
          bestPrice = price;
        }
      } else if (!bestPrice) {
        // No spread info - just use the first one
        bestPrice = price;
      }
    });

    return bestPrice;
  }

  /**
   * Aggregate positions from all providers.
   *
   * @returns All cached positions
   */
  private aggregatePositions(): Position[] {
    const allPositions: Position[] = [];
    this.positionCache.forEach((positions) => {
      allPositions.push(...positions);
    });
    return allPositions;
  }

  /**
   * Aggregate orders from all providers.
   *
   * @returns All cached orders
   */
  private aggregateOrders(): Order[] {
    const allOrders: Order[] = [];
    this.orderCache.forEach((orders) => {
      allOrders.push(...orders);
    });
    return allOrders;
  }

  /**
   * Clear all cached data.
   */
  clearCache(): void {
    this.priceCache.clear();
    this.positionCache.clear();
    this.orderCache.clear();
    this.accountCache.clear();
  }

  /**
   * Get cached price for a symbol from a specific provider.
   *
   * @param symbol - Market symbol
   * @param providerId - Provider ID
   * @returns Cached price update or undefined
   */
  getCachedPrice(
    symbol: string,
    providerId: PerpsProviderType,
  ): PriceUpdate | undefined {
    return this.priceCache.get(symbol)?.get(providerId);
  }

  /**
   * Get all cached prices for a symbol.
   *
   * @param symbol - Market symbol
   * @returns Map of provider ID to price update
   */
  getAllCachedPricesForSymbol(
    symbol: string,
  ): Map<PerpsProviderType, PriceUpdate> | undefined {
    return this.priceCache.get(symbol);
  }
}
