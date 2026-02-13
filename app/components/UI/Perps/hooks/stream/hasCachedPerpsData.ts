import Engine from '../../../../../core/Engine';
import { findEvmAccount } from '@metamask/perps-controller';

type CacheField =
  | 'cachedPositions'
  | 'cachedOrders'
  | 'cachedAccountState'
  | 'cachedMarketData';

const USER_DATA_FIELDS: CacheField[] = [
  'cachedPositions',
  'cachedOrders',
  'cachedAccountState',
];

/**
 * Check if the controller's cached data belongs to the currently selected
 * EVM account.  Market data is not account-specific, so it always passes.
 */
function isCacheForCurrentAccount(controller: {
  state?: { cachedUserDataAddress?: string | null };
}): boolean {
  const cachedAddr = controller?.state?.cachedUserDataAddress;
  if (!cachedAddr) return true; // No address recorded = trust the cache
  try {
    const { AccountTreeController } = Engine.context;
    const accounts =
      AccountTreeController.getAccountsFromSelectedAccountGroup();
    const evmAccount = findEvmAccount(accounts);
    if (!evmAccount?.address) return true; // Can't determine current account
    return cachedAddr.toLowerCase() === evmAccount.address.toLowerCase();
  } catch {
    return true; // Error getting account = trust cache
  }
}

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
  if (preloaded == null) return false;
  if (
    USER_DATA_FIELDS.includes(cacheField) &&
    !isCacheForCurrentAccount(controller)
  ) {
    return false;
  }
  return true;
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
  const preloaded = (controller?.state?.[cacheField] as T) ?? null;
  if (preloaded == null) return null;
  if (
    USER_DATA_FIELDS.includes(cacheField) &&
    !isCacheForCurrentAccount(controller)
  ) {
    return null;
  }
  return preloaded;
}
