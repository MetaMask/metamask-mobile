import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import type { AccountsApiActivity } from '../types/moneyActivity';
import { parseAccountsApiActivity } from '../utils/accountsApi';

export interface UseMoneyAccountApiActivityResult {
  activity: AccountsApiActivity[];
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

const EMPTY: AccountsApiActivity[] = [];

/**
 * Off-device MetaMask Card activity (spends and cashback) for the primary Money
 * account, sourced from the Accounts API via the shared {@link apiClient} (same
 * client/auth path as the unified activity list). Both kinds arrive in one
 * response — `parseAccountsApiActivity` splits them by type — so a single query
 * backs the whole list. React Query handles caching, dedup and
 * stale-while-revalidate refetching.
 */
export function useMoneyAccountApiActivity(): UseMoneyAccountApiActivityResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const rawAddress = primaryMoneyAccount?.address;
  const moneyAddress = rawAddress ? toChecksumHexAddress(rawAddress) : '';

  const queryOptions = apiClient.accounts.getV1AccountTransactionsQueryOptions(
    moneyAddress,
    { chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS, sortDirection: 'DESC' },
  );

  // Parse at the boundary: the cache holds raw rows, the view gets activity.
  const select = useMemo(
    () => (response: V1AccountTransactionsResponse) =>
      parseAccountsApiActivity(response, moneyAddress),
    [moneyAddress],
  );

  // `apiClient` is built against query-core v5; this repo's react-query is v4, so
  // the query options aren't nominally compatible. The shapes match at runtime.
  const query = useQuery({
    ...queryOptions,
    select,
    enabled: moneyAddress !== '',
    staleTime: 5 * MINUTE,
    retry: false,
  } as unknown as UseQueryOptions<
    V1AccountTransactionsResponse,
    Error,
    AccountsApiActivity[]
  >);

  return {
    activity: query.data ?? EMPTY,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the spinner.
    isLoading: query.isInitialLoading,
    error: query.isError,
    refetch: query.refetch,
  };
}
