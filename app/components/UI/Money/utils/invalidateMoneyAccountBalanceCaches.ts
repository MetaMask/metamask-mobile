import type { CanonicalMoneyAccountBalanceResponse } from '@metamask/money-account-balance-service';
import { isStrictHexString } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import ReactQueryService from '../../../../core/ReactQueryService';
import { armFreshMoneyBalanceWindow } from '../../../../core/ReactQueryService/moneyBalanceFreshWindow';
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

/**
 * Force a fresh Money Account balance read and write it into the UI cache.
 *
 * The UI query key is `[fetchBalanceWithFallback, address]`, so a normal
 * refetch always calls the facade with no options and can be served from the
 * Money API response cache. This helper calls the facade directly with
 * `{ fresh: true }`, which the API source forwards as `Cache-Control: no-cache`.
 * When `minBlock` is set and the API `as_of_block` is still behind it, the
 * service throws and falls back to RPC when the active policy allows it.
 *
 * `fresh` is ignored on the RPC path, so the RPC adapter cache is invalidated
 * first. The result is written onto the existing UI query key so observers
 * update without forking the cache entry. In-flight facade refetches are
 * cancelled first so they cannot commit a non-fresh read afterwards, and a
 * short window keeps later interval refetches on the same fresh path.
 *
 * @param address - Money account address (same casing as used by the UI query).
 * @param options - Optional confirmed-block floor for the API read.
 * @param options.minBlock - Minimum indexer block the API result must reach.
 * @returns The canonical balance written into the UI cache.
 */
export async function refreshMoneyAccountBalanceFresh(
  address: string,
  { minBlock }: { minBlock?: number } = {},
): Promise<CanonicalMoneyAccountBalanceResponse> {
  // Checksummed addresses are mixed-case. `isHexAddress` only accepts
  // lowercase, so it would reject real Money account addresses.
  if (!isStrictHexString(address)) {
    throw new Error('Money account address is not a hex string');
  }

  const facadeQueryKey = [
    MoneyAccountBalanceServiceQueryKeys.FETCH_BALANCE_WITH_FALLBACK,
    address,
  ];

  armFreshMoneyBalanceWindow(address, minBlock);
  await ReactQueryService.queryClient.cancelQueries({
    queryKey: facadeQueryKey,
  });

  await Engine.controllerMessenger.call(
    'MoneyAccountBalanceService:invalidateQueries',
    {
      queryKey: [
        MoneyAccountBalanceServiceQueryKeys.GET_MONEY_ACCOUNT_BALANCE,
        address,
      ],
    },
  );

  const result = await Engine.controllerMessenger.call(
    'MoneyAccountBalanceService:fetchBalanceWithFallback',
    address,
    {
      fresh: true,
      ...(minBlock !== undefined && { minBlock }),
    },
  );

  await ReactQueryService.queryClient.cancelQueries({
    queryKey: facadeQueryKey,
  });
  ReactQueryService.queryClient.setQueryData(facadeQueryKey, result);

  return result;
}
