import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
import { apiClient } from '../../../core/apiClient';
import { selectEvmAddress } from '../../../selectors/accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAllConfiguredEvmCaipNetworks } from '../../../selectors/networkController';
import { selectAllTokens } from '../../../selectors/tokensController';
import type { KnownTokensByChainAndAccount } from '../../../util/activity-adapters';
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
  // The API omits `decimal` on value transfers it has not enriched yet, so the
  // user's imported tokens supply the scale instead (TMCU-1303).
  const knownTokens = useSelector(
    selectAllTokens,
  ) as KnownTokensByChainAndAccount;
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
    () =>
      selectApiEvmTransactions({
        address: evmAddress,
        excludedTxHashes,
        knownTokens,
      }),
    [evmAddress, excludedTxHashes, knownTokens],
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
