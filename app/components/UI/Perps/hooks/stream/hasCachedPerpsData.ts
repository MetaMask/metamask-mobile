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
  const result =
    controller?.getCachedMarketDataForActiveProvider?.({ skipTTL: true }) ??
    null;
  return result;
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
  const result =
    controller?.getCachedUserDataForActiveProvider?.({ skipTTL: true }) ?? null;
  return result;
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
  let result = false;
  if (cacheField === 'cachedMarketData') {
    const marketData = getMarketDataFromController();
    result = marketData != null;
  } else {
    const userData = getUserDataFromController();
    if (!userData) {
      result = false;
    } else if (cacheField === 'cachedPositions') {
      result = true; // positions is always an array (possibly empty = valid cache)
    } else if (cacheField === 'cachedOrders') {
      result = true; // orders is always an array (possibly empty = valid cache)
    } else if (cacheField === 'cachedAccountState') {
      result = userData.accountState != null;
    }
  }
  return result;
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
  let result: T | null = null;
  if (cacheField === 'cachedMarketData') {
    result = (getMarketDataFromController() as T) ?? null;
  } else {
    const userData = getUserDataFromController();
    if (userData) {
      if (cacheField === 'cachedPositions') {
        result = userData.positions as T;
      } else if (cacheField === 'cachedOrders') {
        result = userData.orders as T;
      } else if (cacheField === 'cachedAccountState') {
        result = (userData.accountState as T) ?? null;
      }
    }
  }
  return result;
}
