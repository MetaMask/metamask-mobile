import Engine from '../../../../../core/Engine';

type CacheField =
  | 'cachedPositions'
  | 'cachedOrders'
  | 'cachedAccountState'
  | 'cachedMarketData';

/**
 * Check if the PerpsController has cached data for the given field.
 * Used as a lazy useState initializer to skip the loading skeleton
 * when preloaded data is available.
 *
 * Cache freshness is managed by the controller's 5-minute preload cycle
 * (startMarketDataPreload), not by the hooks.
 */
export function hasPreloadedUserData(cacheField: CacheField): boolean {
  const controller = Engine.context.PerpsController;
  const preloaded = controller?.state?.[cacheField];
  // null/undefined = not loaded yet, [] = loaded with no data (valid cache)
  return preloaded != null;
}

/**
 * Read preloaded data from the PerpsController cache.
 * Used as a lazy useState initializer so the first render already
 * has data instead of showing an empty screen.
 *
 * Cache freshness is managed by the controller's 5-minute preload cycle
 * (startMarketDataPreload), not by the hooks.
 */
export function getPreloadedUserData<T>(cacheField: CacheField): T | null {
  const controller = Engine.context.PerpsController;
  return (controller?.state?.[cacheField] as T) ?? null;
}
