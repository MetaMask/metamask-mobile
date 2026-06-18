import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import type { CashbackTransaction } from '../types/moneyActivity';
import { parseCashbackTransactions } from '../utils/accountsApi';

export interface UseMoneyAccountCashbackTransactionsResult {
  cashbackTransactions: CashbackTransaction[];
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

const EMPTY: CashbackTransaction[] = [];

/**
 * Card cashback rewards for the primary Money account, sourced from the Accounts
 * API. Uses the same query options (and therefore the same React Query key) as
 * {@link useMoneyAccountCardTransactions}, so the two hooks share one network
 * request and cache entry — only the `select` differs: card spends parse the
 * outbound leg, cashback parses the inbound credit.
 */
export function useMoneyAccountCashbackTransactions(): UseMoneyAccountCashbackTransactionsResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const rawAddress = primaryMoneyAccount?.address;
  const moneyAddress = rawAddress ? toChecksumHexAddress(rawAddress) : '';

  const queryOptions = apiClient.accounts.getV1AccountTransactionsQueryOptions(
    moneyAddress,
    { chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS, sortDirection: 'DESC' },
  );

  // Parse at the boundary: the cache holds raw rows, the view gets CashbackTransactions.
  const select = useMemo(
    () => (response: V1AccountTransactionsResponse) =>
      parseCashbackTransactions(response, moneyAddress),
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
    CashbackTransaction[]
  >);

  return {
    cashbackTransactions: query.data ?? EMPTY,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the spinner.
    isLoading: query.isInitialLoading,
    error: query.isError,
    refetch: query.refetch,
  };
}
