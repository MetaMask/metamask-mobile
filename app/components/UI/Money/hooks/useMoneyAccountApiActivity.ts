import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyCardActivityCashbackMultisendContracts } from '../selectors/featureFlags';
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

/** Cap upfront pagination — the UI only surfaces a subset of card/cashback rows. */
export const MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES = 5;

const ACCOUNT_ACTIVITY_QUERY_OPTIONS = {
  chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
  sortDirection: 'DESC' as const,
};

/**
 * Fetch up to {@link MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES} pages from the
 * Accounts API v1 transactions endpoint, merging rows into one response.
 */
export async function fetchMoneyAccountApiActivityPages(
  moneyAddress: string,
): Promise<V1AccountTransactionsResponse> {
  let cursor: string | undefined;
  const data: NonNullable<V1AccountTransactionsResponse['data']> = [];
  let pageInfo: V1AccountTransactionsResponse['pageInfo'] = {
    count: 0,
    hasNextPage: false,
  };

  for (let page = 0; page < MAX_MONEY_ACCOUNT_API_ACTIVITY_PAGES; page++) {
    const response = await apiClient.accounts.fetchV1AccountTransactions(
      moneyAddress,
      { ...ACCOUNT_ACTIVITY_QUERY_OPTIONS, cursor },
    );
    data.push(...(response.data ?? []));
    pageInfo = response.pageInfo;
    if (!response.pageInfo.hasNextPage || !response.pageInfo.cursor) {
      break;
    }
    cursor = response.pageInfo.cursor;
  }

  return { data, pageInfo };
}

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
  const cashbackMultisendContracts = useSelector(
    selectMoneyCardActivityCashbackMultisendContracts,
  );
  const rawAddress = primaryMoneyAccount?.address;
  const moneyAddress = rawAddress ? toChecksumHexAddress(rawAddress) : '';

  const queryOptions = apiClient.accounts.getV1AccountTransactionsQueryOptions(
    moneyAddress,
    ACCOUNT_ACTIVITY_QUERY_OPTIONS,
  );

  // Parse at the boundary: the cache holds raw rows, the view gets activity.
  const select = useMemo(
    () => (response: V1AccountTransactionsResponse) =>
      parseAccountsApiActivity(
        response,
        moneyAddress,
        cashbackMultisendContracts,
      ),
    [moneyAddress, cashbackMultisendContracts],
  );

  // `apiClient` is built against query-core v5; this repo's react-query is v4, so
  // the query options aren't nominally compatible. The shapes match at runtime.
  const query = useQuery({
    ...queryOptions,
    queryFn: () => fetchMoneyAccountApiActivityPages(moneyAddress),
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
