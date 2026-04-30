import {
  InfiniteData,
  QueryFunctionContext,
  QueryFunction,
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
import type { ConfirmedEvmTransaction } from '../helpers/types';

type ConfirmedEvmTransactionsPage = Omit<
  V4MultiAccountTransactionsResponse,
  'data'
> & {
  data: ConfirmedEvmTransaction[];
};

export const useTransactionsQuery = () => {
  const accountAddresses = useSelector(selectAccountGroupEvmAccountAddresses);
  const networks = useSelector(selectEvmEnabledCaipNetworks);
  const selectFn = useMemo(
    () =>
      selectConfirmedTransactions({
        accountAddresses: [...accountAddresses],
      }),
    [accountAddresses],
  );

  const queryOptions = useMemo(() => {
    const options =
      getApiClient().accounts.getV4MultiAccountTransactionsInfiniteQueryOptions(
        {
          accountAddresses: [...accountAddresses],
          networks: [...networks],
          includeTxMetadata: true,
        },
      );

    return {
      queryKey: options.queryKey as QueryKey,
      queryFn: options.queryFn as QueryFunction<
        V4MultiAccountTransactionsResponse,
        QueryKey,
        string | undefined
      >,
    };
  }, [accountAddresses, networks]);

  return useInfiniteQuery<
    V4MultiAccountTransactionsResponse,
    Error,
    ConfirmedEvmTransactionsPage,
    QueryKey
  >({
    queryKey: queryOptions.queryKey,
    queryFn: (({
      pageParam,
      signal,
    }: QueryFunctionContext<QueryKey, string | undefined>) =>
      queryOptions.queryFn({
        pageParam,
        signal,
        queryKey: queryOptions.queryKey,
        meta: undefined,
      })) as QueryFunction<
      V4MultiAccountTransactionsResponse,
      QueryKey,
      string | undefined
    >,
    getNextPageParam: ({ pageInfo }) =>
      pageInfo.hasNextPage ? pageInfo.endCursor : undefined,
    select: selectFn,
    enabled: accountAddresses.length > 0 && networks.length > 0,
    staleTime: 5 * MINUTE,
  });
};
