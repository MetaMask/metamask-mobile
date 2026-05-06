import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
import { apiClient } from '../../../core/apiClient';
import { selectEvmAddress } from '../../../selectors/accountsController';
import { selectEvmEnabledCaipNetworks } from '../../../selectors/networkEnablementController';
import { selectTransactions } from './helpers/transformations';
import { MINUTE } from '../../../constants/time';
import { selectRequiredTransactionHashes } from '../../../selectors/transactionController';

export const useTransactionsQuery = () => {
  const evmAddress = useSelector(selectEvmAddress) || '';
  const networks = useSelector(selectEvmEnabledCaipNetworks);
  const excludedTxHashes = useSelector(selectRequiredTransactionHashes);
  const accountAddresses = evmAddress
    ? [toCaipAccountId(KnownCaipNamespace.Eip155, '0', evmAddress)]
    : [];

  const queryOptions =
    apiClient.accounts.getV4MultiAccountTransactionsInfiniteQueryOptions({
      accountAddresses,
      networks,
      includeTxMetadata: true,
    });

  const selectFn = useMemo(
    () => selectTransactions({ address: evmAddress, excludedTxHashes }),
    [evmAddress, excludedTxHashes],
  );

  // @ts-expect-error apiClient returns v5 types, repo still in v4
  return useInfiniteQuery({
    ...queryOptions,
    select: selectFn,
    enabled: accountAddresses.length > 0 && networks.length > 0,
    staleTime: 5 * MINUTE,
    retry: false,
  });
};
