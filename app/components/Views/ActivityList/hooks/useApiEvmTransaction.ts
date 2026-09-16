import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { KnownCaipNamespace, toCaipAccountId } from '@metamask/utils';
import type {
  V1TransactionByHashResponse,
  V4MultiAccountTransactionsResponse,
} from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import { selectEvmAddress } from '../../../../selectors/accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectAllConfiguredEvmCaipNetworks } from '../../../../selectors/networkController';
import { MINUTE } from '../../../../constants/time';

interface ApiEvmTransactionPages {
  pages: { data: { hash?: string }[] }[];
}

export function findApiEvmTransactionByHash(
  data: ApiEvmTransactionPages | undefined,
  hash?: string,
) {
  if (!data || !hash) {
    return undefined;
  }

  const normalizedHash = hash.toLowerCase();
  for (const page of data.pages) {
    const match = page.data.find(
      (transaction) => transaction.hash?.toLowerCase() === normalizedHash,
    );
    if (match) {
      return match;
    }
  }

  return undefined;
}

export function useApiEvmTransaction(hash?: string) {
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const globalEvmAddress = useSelector(selectEvmAddress);
  const evmAddress = (groupEvmAccount?.address ?? globalEvmAddress ?? '') || '';
  const networks = useSelector(selectAllConfiguredEvmCaipNetworks);
  const accountAddresses = evmAddress
    ? [toCaipAccountId(KnownCaipNamespace.Eip155, '0', evmAddress)]
    : [];

  const queryOptions =
    apiClient.accounts.getV4MultiAccountTransactionsInfiniteQueryOptions({
      accountAddresses,
      networks,
      includeTxMetadata: true,
    });

  const enabled =
    Boolean(hash) && accountAddresses.length > 0 && networks.length > 0;

  // @ts-expect-error apiClient returns v5 types, repo still in v4
  const { data } = useInfiniteQuery({
    ...queryOptions,
    select: (queryData: InfiniteData<V4MultiAccountTransactionsResponse>) =>
      findApiEvmTransactionByHash(queryData, hash),
    enabled,
    staleTime: 5 * MINUTE,
    retry: false,
  });

  return data as V1TransactionByHashResponse | undefined;
}
