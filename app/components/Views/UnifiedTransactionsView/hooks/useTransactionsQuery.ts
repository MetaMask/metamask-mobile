import {
  QueryFunctionContext,
  QueryKey,
  useInfiniteQuery,
} from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { V4MultiAccountTransactionsResponse } from '@metamask/core-backend';
import { getApiClient } from '../../../../core/apiClient';
import { selectAccountGroupEvmAccountAddresses } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectEvmEnabledCaipNetworks } from '../../../../selectors/networkEnablementController';
import { selectConfirmedTransactions } from '../helpers/mappers';
import { MINUTE } from '../../../../constants/time';

export const useTransactionsQuery = () => {
  const accountAddresses = useSelector(selectAccountGroupEvmAccountAddresses);
  const networks = useSelector(selectEvmEnabledCaipNetworks);
  const selectFn = useMemo(
    () =>
      selectConfirmedTransactions({
        accountAddresses,
      }),
    [accountAddresses],
  );

  const queryOptions = useMemo(
    () =>
      getApiClient().accounts.getV4MultiAccountTransactionsInfiniteQueryOptions(
        {
          accountAddresses: [...accountAddresses],
          networks: [...networks],
          includeTxMetadata: true,
        },
      ),
    [accountAddresses, networks],
  );

  return useInfiniteQuery<
    V4MultiAccountTransactionsResponse,
    Error,
    ReturnType<ReturnType<typeof selectConfirmedTransactions>>,
    QueryKey
  >({
    queryKey: queryOptions.queryKey as QueryKey,
    queryFn: ({
      pageParam,
      signal,
    }: QueryFunctionContext<QueryKey, string | undefined>) =>
      queryOptions.queryFn({ pageParam, signal }),
    getNextPageParam: queryOptions.getNextPageParam,
    select: selectFn,
    enabled: accountAddresses.length > 0 && networks.length > 0,
    staleTime: 5 * MINUTE,
  });
};
