import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
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

  const queryOptions =
    getApiClient().accounts.getV4MultiAccountTransactionsInfiniteQueryOptions({
      accountAddresses,
      networks,
      includeTxMetadata: true,
    });

  return useInfiniteQuery({
    ...queryOptions,
    select: selectFn,
    enabled: accountAddresses.length > 0 && networks.length > 0,
    staleTime: 5 * MINUTE,
  });
};
