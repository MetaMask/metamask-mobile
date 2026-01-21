import type {
  PerpsProviderType,
  IPerpsProvider,
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

/**
 * SubscriptionMultiplexer manages WebSocket subscriptions across multiple providers
 * and aggregates callbacks to provide unified data streams.
 *
 * Key responsibilities:
 * 1. Subscribe to data from multiple providers simultaneously
 * 2. Inject providerId into all data objects
 * 3. Aggregate updates and invoke the unified callback
 * 4. Manage unsubscribe functions for cleanup
 */
export class SubscriptionMultiplexer {
  /**
   * Subscribe to price updates from multiple providers.
   * Each price update is tagged with its source providerId.
   *
   * @param params - Subscription parameters
   * @param providers - Array of [providerId, provider] tuples
   * @returns Unsubscribe function that cleans up all provider subscriptions
   */
  subscribeToPrices(
    params: Omit<SubscribePricesParams, 'callback'> & {
      callback: (updates: PriceUpdate[]) => void;
    },
    providers: [PerpsProviderType, IPerpsProvider][],
  ): () => void {
    const unsubscribers: (() => void)[] = [];

    for (const [providerId, provider] of providers) {
      try {
        const unsub = provider.subscribeToPrices({
          ...params,
          callback: (updates) => {
            // Tag each update with its provider source
            const taggedUpdates = updates.map((update) => ({
              ...update,
              providerId,
            }));
            params.callback(taggedUpdates);
          },
        });
        unsubscribers.push(unsub);
      } catch {
        // Provider subscription failed, continue with others
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
    };
  }

  /**
   * Subscribe to position updates from multiple providers.
   * Positions are aggregated and tagged with their source providerId.
   *
   * @param params - Subscription parameters
   * @param providers - Array of [providerId, provider] tuples
   * @returns Unsubscribe function
   */
  subscribeToPositions(
    params: Omit<SubscribePositionsParams, 'callback'> & {
      callback: (positions: Position[]) => void;
    },
    providers: [PerpsProviderType, IPerpsProvider][],
  ): () => void {
    const unsubscribers: (() => void)[] = [];
    const positionCache: Map<PerpsProviderType, Position[]> = new Map();

    const emitAggregated = () => {
      const allPositions: Position[] = [];
      positionCache.forEach((positions) => {
        allPositions.push(...positions);
      });
      params.callback(allPositions);
    };

    for (const [providerId, provider] of providers) {
      try {
        const unsub = provider.subscribeToPositions({
          ...params,
          callback: (positions) => {
            // Tag and cache positions from this provider
            const taggedPositions = positions.map((pos) => ({
              ...pos,
              providerId,
            }));
            positionCache.set(providerId, taggedPositions);
            emitAggregated();
          },
        });
        unsubscribers.push(unsub);
      } catch {
        // Provider subscription failed, continue with others
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
      positionCache.clear();
    };
  }

  /**
   * Subscribe to order fill updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @param providers - Array of [providerId, provider] tuples
   * @returns Unsubscribe function
   */
  subscribeToOrderFills(
    params: Omit<SubscribeOrderFillsParams, 'callback'> & {
      callback: (fills: OrderFill[], isSnapshot?: boolean) => void;
    },
    providers: [PerpsProviderType, IPerpsProvider][],
  ): () => void {
    const unsubscribers: (() => void)[] = [];

    for (const [providerId, provider] of providers) {
      try {
        const unsub = provider.subscribeToOrderFills({
          ...params,
          callback: (fills, isSnapshot) => {
            const taggedFills = fills.map((fill) => ({
              ...fill,
              providerId,
            }));
            params.callback(taggedFills, isSnapshot);
          },
        });
        unsubscribers.push(unsub);
      } catch {
        // Provider subscription failed, continue with others
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
    };
  }

  /**
   * Subscribe to order updates from multiple providers.
   *
   * @param params - Subscription parameters
   * @param providers - Array of [providerId, provider] tuples
   * @returns Unsubscribe function
   */
  subscribeToOrders(
    params: Omit<SubscribeOrdersParams, 'callback'> & {
      callback: (orders: Order[]) => void;
    },
    providers: [PerpsProviderType, IPerpsProvider][],
  ): () => void {
    const unsubscribers: (() => void)[] = [];
    const orderCache: Map<PerpsProviderType, Order[]> = new Map();

    const emitAggregated = () => {
      const allOrders: Order[] = [];
      orderCache.forEach((orders) => {
        allOrders.push(...orders);
      });
      params.callback(allOrders);
    };

    for (const [providerId, provider] of providers) {
      try {
        const unsub = provider.subscribeToOrders({
          ...params,
          callback: (orders) => {
            const taggedOrders = orders.map((order) => ({
              ...order,
              providerId,
            }));
            orderCache.set(providerId, taggedOrders);
            emitAggregated();
          },
        });
        unsubscribers.push(unsub);
      } catch {
        // Provider subscription failed, continue with others
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
      orderCache.clear();
    };
  }

  /**
   * Subscribe to account state updates from multiple providers.
   * Since AccountState is a single object per provider, this aggregates
   * into a combined view.
   *
   * @param params - Subscription parameters
   * @param providers - Array of [providerId, provider] tuples
   * @param aggregateCallback - Optional callback that receives the full aggregated state
   * @returns Unsubscribe function
   */
  subscribeToAccount(
    params: Omit<SubscribeAccountParams, 'callback'> & {
      callback: (account: AccountState) => void;
    },
    providers: [PerpsProviderType, IPerpsProvider][],
    aggregateCallback?: (
      accounts: Map<PerpsProviderType, AccountState>,
    ) => void,
  ): () => void {
    const unsubscribers: (() => void)[] = [];
    const accountCache: Map<PerpsProviderType, AccountState> = new Map();

    for (const [providerId, provider] of providers) {
      try {
        const unsub = provider.subscribeToAccount({
          ...params,
          callback: (account) => {
            const taggedAccount = { ...account, providerId };
            accountCache.set(providerId, taggedAccount);

            // Emit individual account update
            params.callback(taggedAccount);

            // Optionally emit aggregated update
            if (aggregateCallback) {
              aggregateCallback(accountCache);
            }
          },
        });
        unsubscribers.push(unsub);
      } catch {
        // Provider subscription failed, continue with others
      }
    }

    return () => {
      unsubscribers.forEach((unsub) => {
        try {
          unsub();
        } catch {
          // Ignore cleanup errors
        }
      });
      accountCache.clear();
    };
  }
}
