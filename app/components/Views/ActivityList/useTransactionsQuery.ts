import {
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import type { V4MultiAccountTransactionsResponse } from '@metamask/core-backend';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
import { apiClient } from '../../../core/apiClient';
import { selectEvmAddress } from '../../../selectors/accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAllConfiguredEvmCaipNetworks } from '../../../selectors/networkController';
import { selectApiEvmTransactions } from './helpers/transformations';
import { MINUTE } from '../../../constants/time';
import { selectExcludedActivityTransactionHashes } from '../../../selectors/transactionController';

export const useTransactionsQuery = () => {
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const globalEvmAddress = useSelector(selectEvmAddress);
  /** Activity must load EVM history for the group's EVM account when e.g. Bitcoin is selected. */
  const evmAddress = (groupEvmAccount?.address ?? globalEvmAddress ?? '') || '';
  // Fetch history for every configured network — decoupled from
  // NetworkEnablementController so enabling/disabling a single network (e.g.
  // Predict enabling Polygon) never collapses the Activity feed to one network.
  const networks = useSelector(selectAllConfiguredEvmCaipNetworks);
  const excludedTxHashes = useSelector(selectExcludedActivityTransactionHashes);
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
    () => selectApiEvmTransactions({ address: evmAddress, excludedTxHashes }),
    [evmAddress, excludedTxHashes],
  );

  return useInfiniteQuery({
    ...(queryOptions as UseInfiniteQueryOptions<
      V4MultiAccountTransactionsResponse,
      Error,
      ReturnType<typeof selectFn>,
      readonly unknown[],
      string | undefined
    >),
    select: selectFn,
    enabled: accountAddresses.length > 0 && networks.length > 0,
    staleTime: 5 * MINUTE,
    retry: false,
  });
};
