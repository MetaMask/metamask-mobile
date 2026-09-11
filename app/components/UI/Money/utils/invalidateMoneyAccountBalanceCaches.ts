import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import {
  MoneyAccountApiDataServiceQueryKeys,
  MoneyAccountBalanceServiceQueryKeys,
} from '../queryKeys';

/**
 * Force-refresh Money Account balance through the facade.
 *
 * `fetchBalanceWithFallback` has no service-local cache entry. It reads either
 * `getMoneyAccountBalance` (balance-service QueryClient) or
 * `MoneyAccountApiDataService:fetchPositions` (API-service QueryClient). UI
 * invalidation of the facade key only clears the UI cache and forwards the
 * same filter to `MoneyAccountBalanceService:invalidateQueries`, which does
 * not match either source key — so source caches would otherwise keep serving
 * stale values on the subsequent facade refetch.
 *
 * This helper busts both source caches via messenger, then invalidates the UI
 * facade query so observers refetch.
 *
 * @param address - Money account address (same casing as used by the UI query).
 */
export async function invalidateMoneyAccountBalanceCaches(
  address: string,
): Promise<void> {
  await Promise.all([
    Engine.controllerMessenger.call(
      'MoneyAccountBalanceService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
          address,
        ],
      },
    ),
    Engine.controllerMessenger.call(
      'MoneyAccountApiDataService:invalidateQueries',
      {
        queryKey: [
          MoneyAccountApiDataServiceQueryKeys.FETCH_POSITIONS,
          // Package lowercases the address when building the positions query key.
          address.toLowerCase(),
        ],
      },
    ),
  ]);

  await ReactQueryService.queryClient.invalidateQueries({
    queryKey: [
      MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
      address,
    ],
    refetchType: 'all',
  });
}
