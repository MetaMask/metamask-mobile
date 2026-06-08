import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useQuery, type UseQueryOptions } from '@tanstack/react-query';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectIsMoneyAccountDelegatedForCard } from '../../../../selectors/cardController';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import type { CardTransaction } from '../types/moneyActivity';
import { parseCardTransactions } from '../utils/accountsApi';

export interface UseMoneyAccountCardTransactionsResult {
  cardTransactions: CardTransaction[];
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

const EMPTY: CardTransaction[] = [];

/**
 * Card payments for the primary Money account, sourced from the Accounts API via
 * the shared {@link apiClient} (same client/auth path as the unified activity
 * list). Requests the latest page only; React Query handles caching, dedup and
 * stale-while-revalidate refetching.
 */
export function useMoneyAccountCardTransactions(): UseMoneyAccountCardTransactionsResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const isLinked = useSelector(selectIsMoneyAccountDelegatedForCard);
  const rawAddress = primaryMoneyAccount?.address;
  const moneyAddress = rawAddress ? toChecksumHexAddress(rawAddress) : '';

  const queryOptions = apiClient.accounts.getV1AccountTransactionsQueryOptions(
    moneyAddress,
    { chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS, sortDirection: 'DESC' },
  );

  // Parse at the boundary: the cache holds raw rows, the view gets CardTransactions.
  const select = useMemo(
    () => (response: V1AccountTransactionsResponse) =>
      parseCardTransactions(response, moneyAddress),
    [moneyAddress],
  );

  // `apiClient` is built against query-core v5; this repo's react-query is v4, so
  // the query options aren't nominally compatible. The shapes match at runtime.
  const query = useQuery({
    ...queryOptions,
    select,
    enabled: isLinked && moneyAddress !== '',
    staleTime: 5 * MINUTE,
    retry: false,
  } as unknown as UseQueryOptions<
    V1AccountTransactionsResponse,
    Error,
    CardTransaction[]
  >);

  return {
    cardTransactions: query.data ?? EMPTY,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the spinner.
    isLoading: query.isInitialLoading,
    error: query.isError,
    refetch: query.refetch,
  };
}
