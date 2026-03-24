import Engine from '../../../../../core/Engine';
import type { Position, Order, AccountState } from '@metamask/perps-controller';

type CacheField =
  | 'cachedPositions'
  | 'cachedOrders'
  | 'cachedAccountState'
  | 'cachedMarketData';

/**
 * Read per-provider market data from the controller's getCachedMarketDataForActiveProvider helper.
 */
function getMarketDataFromController(): unknown[] | null {
  const controller = Engine.context.PerpsController;
  return controller?.getCachedMarketDataForActiveProvider?.() ?? null;
}

/**
 * Read per-provider user data from the controller's getCachedUserDataForActiveProvider helper.
 * Returns positions, orders, and accountState for the active provider with TTL + address validation.
 */
function getUserDataFromController(): {
  positions: Position[];
  orders: Order[];
  accountState: AccountState | null;
} | null {
  const controller = Engine.context.PerpsController;
  return controller?.getCachedUserDataForActiveProvider?.() ?? null;
}

/**
 * Check if the PerpsController has cached data for the given field.
 * Used as a lazy useState initializer to skip the loading skeleton
 * when preloaded data is available.
 *
 * Cache freshness is managed by the controller's 5-minute preload cycle
 * (startMarketDataPreload), not by the hooks.
 */
export function hasPreloadedData(cacheField: CacheField): boolean {
  if (cacheField === 'cachedMarketData') {
    const marketData = getMarketDataFromController();
    return marketData != null;
  }

  const userData = getUserDataFromController();
  if (!userData) return false;

  if (cacheField === 'cachedPositions') {
    return true; // positions is always an array (possibly empty = valid cache)
  }
  if (cacheField === 'cachedOrders') {
    return true; // orders is always an array (possibly empty = valid cache)
  }
  if (cacheField === 'cachedAccountState') {
    return userData.accountState != null;
  }
  return false;
}

/**
 * Read preloaded data from the PerpsController cache.
 * Used as a lazy useState initializer so the first render already
 * has data instead of showing an empty screen.
 *
 * Cache freshness is managed by the controller's 5-minute preload cycle
 * (startMarketDataPreload), not by the hooks.
 */
export function getPreloadedData<T>(cacheField: CacheField): T | null {
  if (cacheField === 'cachedMarketData') {
    return (getMarketDataFromController() as T) ?? null;
  }

  const userData = getUserDataFromController();
  if (!userData) return null;

  if (cacheField === 'cachedPositions') {
    return userData.positions as T;
  }
  if (cacheField === 'cachedOrders') {
    return userData.orders as T;
  }
  if (cacheField === 'cachedAccountState') {
    return (userData.accountState as T) ?? null;
  }
  return null;
}
