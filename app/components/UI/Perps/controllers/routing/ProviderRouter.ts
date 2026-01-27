/**
 * ProviderRouter - Simple routing logic for multi-provider order routing
 *
 * Phase 1 implementation: Uses simple routing strategy where:
 * - Explicit providerId always wins
 * - Falls back to default provider otherwise
 *
 * Advanced routing strategies (best_price, user_preference per market, lowest_fee)
 * are deferred to Phase 3.
 */

import type { PerpsProviderType, RoutingStrategy } from '../types';

/**
 * Parameters for selecting a provider for an operation
 */
export interface RouterSelectParams {
  /** Asset identifier (e.g., 'BTC', 'ETH', 'xyz:TSLA') */
  symbol?: string;
  /** Explicit provider override - if provided, always used */
  providerId?: PerpsProviderType;
}

/**
 * ProviderRouter handles routing decisions for write operations
 * in multi-provider scenarios.
 *
 * Phase 1 routing logic is simple:
 * 1. If explicit providerId is passed, use it
 * 2. Otherwise, use the default provider
 *
 * @example
 * ```typescript
 * const router = new ProviderRouter({ defaultProvider: 'hyperliquid' });
 *
 * // With explicit provider
 * router.selectProvider({ providerId: 'myx' }); // Returns 'myx'
 *
 * // Without explicit provider
 * router.selectProvider({ symbol: 'BTC' }); // Returns 'hyperliquid' (default)
 * ```
 */
export class ProviderRouter {
  /** Default provider to use when no explicit providerId is specified */
  private defaultProvider: PerpsProviderType;

  /** Current routing strategy (Phase 1: only 'default_provider' supported) */
  private strategy: RoutingStrategy = 'default_provider';

  /** Map of provider ID to the markets it supports */
  private providerMarkets: Map<PerpsProviderType, Set<string>> = new Map();

  constructor(options: {
    /** Default provider for operations without explicit providerId */
    defaultProvider: PerpsProviderType;
    /** Routing strategy (Phase 1: only 'default_provider' supported) */
    strategy?: RoutingStrategy;
  }) {
    this.defaultProvider = options.defaultProvider;
    if (options.strategy) {
      this.strategy = options.strategy;
    }
  }

  /**
   * Select the provider to use for an operation.
   *
   * Phase 1 logic:
   * - Explicit providerId > defaultProvider
   *
   * @param params - Selection parameters
   * @returns The provider ID to use
   */
  selectProvider(params: RouterSelectParams): PerpsProviderType {
    // Phase 1: explicit providerId always wins
    if (params.providerId) {
      return params.providerId;
    }

    // Fall back to default provider
    return this.defaultProvider;
  }

  /**
   * Get all providers that support a specific market.
   *
   * @param symbol - Market symbol (e.g., 'BTC', 'ETH')
   * @returns Array of provider IDs that support this market
   */
  getProvidersForMarket(symbol: string): PerpsProviderType[] {
    const providers: PerpsProviderType[] = [];
    this.providerMarkets.forEach((markets, providerId) => {
      if (markets.has(symbol)) {
        providers.push(providerId);
      }
    });
    return providers;
  }

  /**
   * Update the markets supported by a provider.
   * Called during provider initialization or market refresh.
   *
   * @param providerId - Provider to update
   * @param markets - Array of market symbols the provider supports
   */
  updateProviderMarkets(
    providerId: PerpsProviderType,
    markets: string[],
  ): void {
    this.providerMarkets.set(providerId, new Set(markets));
  }

  /**
   * Clear markets for a provider (e.g., on disconnect).
   *
   * @param providerId - Provider to clear
   */
  clearProviderMarkets(providerId: PerpsProviderType): void {
    this.providerMarkets.delete(providerId);
  }

  /**
   * Set the default provider for routing.
   *
   * @param providerId - New default provider
   */
  setDefaultProvider(providerId: PerpsProviderType): void {
    this.defaultProvider = providerId;
  }

  /**
   * Get the current default provider.
   *
   * @returns Current default provider ID
   */
  getDefaultProvider(): PerpsProviderType {
    return this.defaultProvider;
  }

  /**
   * Get the current routing strategy.
   *
   * @returns Current routing strategy
   */
  getStrategy(): RoutingStrategy {
    return this.strategy;
  }

  /**
   * Check if a provider supports a specific market.
   *
   * @param providerId - Provider to check
   * @param symbol - Market symbol
   * @returns true if provider supports the market
   */
  providerSupportsMarket(
    providerId: PerpsProviderType,
    symbol: string,
  ): boolean {
    const markets = this.providerMarkets.get(providerId);
    return markets?.has(symbol) ?? false;
  }

  /**
   * Get all registered provider IDs.
   *
   * @returns Array of all provider IDs with registered markets
   */
  getRegisteredProviders(): PerpsProviderType[] {
    return Array.from(this.providerMarkets.keys());
  }
}
