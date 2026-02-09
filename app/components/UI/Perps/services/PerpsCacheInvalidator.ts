/**
 * PerpsCacheInvalidator
 *
 * Generic cache invalidation service for Perps readOnly queries.
 * Provides loosely-coupled invalidation between cache consumers (hooks)
 * and cache invalidators (services that modify data).
 *
 * Architecture:
 * - Hooks subscribe to invalidation events for specific cache types
 * - Services call invalidate() after successful operations
 * - Subscribers clear their caches and re-fetch data
 *
 * This pattern allows readOnly hooks (usePerpsPositionForAsset, etc.) to
 * maintain fast cached data while still being notified when that data
 * becomes stale due to user actions in the perps environment.
 *
 * @example Hook side (consumer):
 * ```typescript
 * useEffect(() => {
 *   const unsub = PerpsCacheInvalidator.subscribe('positions', () => {
 *     clearMyCache();
 *     refetch();
 *   });
 *   return unsub;
 * }, []);
 * ```
 *
 * @example Service side (producer):
 * ```typescript
 * // After successful position close
 * PerpsCacheInvalidator.invalidate('positions');
 * PerpsCacheInvalidator.invalidate('accountState');
 * ```
 */

/**
 * Types of caches that can be invalidated.
 * - 'positions': Position data caches
 * - 'accountState': Account balance/state caches
 * - 'markets': Market data caches (rarely changes)
 */
export type CacheType = 'positions' | 'accountState' | 'markets';

/**
 * Callback function invoked when a cache is invalidated.
 * Typically clears local cache and triggers a re-fetch.
 */
export type InvalidationCallback = () => void;

/**
 * Internal class for managing cache invalidation subscriptions.
 * Singleton pattern ensures all subscribers share the same instance.
 */
class PerpsCacheInvalidatorService {
  private static instance: PerpsCacheInvalidatorService;
  private subscribers = new Map<CacheType, Set<InvalidationCallback>>();

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of the cache invalidator.
   */
  public static getInstance(): PerpsCacheInvalidatorService {
    if (!PerpsCacheInvalidatorService.instance) {
      PerpsCacheInvalidatorService.instance =
        new PerpsCacheInvalidatorService();
    }
    return PerpsCacheInvalidatorService.instance;
  }

  /**
   * Subscribe to invalidation events for a specific cache type.
   *
   * @param type - The cache type to subscribe to
   * @param callback - Function to call when cache is invalidated
   * @returns Unsubscribe function - call this in useEffect cleanup
   *
   * @example
   * ```typescript
   * useEffect(() => {
   *   const unsubscribe = PerpsCacheInvalidator.subscribe('positions', () => {
   *     _clearPositionCache();
   *     checkPositionExists();
   *   });
   *   return unsubscribe;
   * }, [checkPositionExists]);
   * ```
   */
  public subscribe(
    type: CacheType,
    callback: InvalidationCallback,
  ): () => void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    const subscribers = this.subscribers.get(type);
    subscribers?.add(callback);

    // Return unsubscribe function
    return () => {
      this.subscribers.get(type)?.delete(callback);
    };
  }

  /**
   * Invalidate a specific cache type.
   * All subscribers for this cache type will be notified.
   *
   * @param type - The cache type to invalidate
   *
   * @example
   * ```typescript
   * // After closing a position
   * PerpsCacheInvalidator.invalidate('positions');
   * PerpsCacheInvalidator.invalidate('accountState');
   * ```
   */
  public invalidate(type: CacheType): void {
    const callbacks = this.subscribers.get(type);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback();
        } catch {
          // Silently ignore errors in callbacks to prevent one bad subscriber
          // from blocking others. Individual hooks should handle their own errors.
        }
      });
    }
  }

  /**
   * Invalidate all cache types.
   * Notifies all subscribers regardless of cache type.
   *
   * @example
   * ```typescript
   * // After a major state change (e.g., account switch)
   * PerpsCacheInvalidator.invalidateAll();
   * ```
   */
  public invalidateAll(): void {
    this.subscribers.forEach((callbacks) => {
      callbacks.forEach((callback) => {
        try {
          callback();
        } catch {
          // Silently ignore errors in callbacks
        }
      });
    });
  }

  /**
   * Get the number of subscribers for a specific cache type.
   * Useful for debugging and testing.
   *
   * @param type - The cache type to check
   * @returns Number of subscribers
   */
  public getSubscriberCount(type: CacheType): number {
    return this.subscribers.get(type)?.size ?? 0;
  }

  /**
   * Clear all subscribers.
   * WARNING: Only use this for testing purposes.
   * @internal
   */
  public _clearAllSubscribers(): void {
    this.subscribers.clear();
  }
}

// Export singleton instance
export const PerpsCacheInvalidator = PerpsCacheInvalidatorService.getInstance();
