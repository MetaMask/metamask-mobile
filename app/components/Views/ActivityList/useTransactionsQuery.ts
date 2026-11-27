import { useInfiniteQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  type CaipAssetType,
  KnownCaipNamespace,
  parseCaipAssetType,
  toCaipAccountId,
} from '@metamask/utils';
import { apiClient } from '../../../core/apiClient';
import { selectEvmAddress } from '../../../selectors/accountsController';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../selectors/multichainAccounts/accountTreeController';
import { selectAllConfiguredEvmCaipNetworks } from '../../../selectors/networkController';
import { selectApiEvmTransactions } from './helpers/transformations';
import { MINUTE } from '../../../constants/time';
import { selectExcludedActivityTransactionHashes } from '../../../selectors/transactionController';

type TransactionQueryOptions = ReturnType<
  typeof apiClient.accounts.getV5MultiAccountTransactionsInfiniteQueryOptions
>;
type QueryOptions = Extract<
  TransactionQueryOptions,
  { getNextPageParam: unknown }
>;

const maxPagesPerVisibleFetch = 5;

export const useTransactionsQuery = (filters?: {
  assetId?: CaipAssetType;
  enabled?: boolean;
}) => {
  const groupEvmAccount = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  );
  const globalEvmAddress = useSelector(selectEvmAddress);
  /** Activity must load EVM history for the group's EVM account when e.g. Bitcoin is selected. */
  const evmAddress = (groupEvmAccount?.address ?? globalEvmAddress ?? '') || '';
  // Fetch history for every configured network — decoupled from
  // NetworkEnablementController so enabling/disabling a single network (e.g.
  // Predict enabling Polygon) never collapses the Activity feed to one network.
  const allNetworks = useSelector(selectAllConfiguredEvmCaipNetworks);
  const excludedTxHashes = useSelector(selectExcludedActivityTransactionHashes);

  const networks = useMemo(() => {
    if (filters?.assetId) {
      const { chainId } = parseCaipAssetType(filters.assetId);
      return allNetworks.filter((network) => network === chainId);
    }
    return allNetworks;
  }, [filters?.assetId, allNetworks]);

  const accountIds = useMemo(
    () =>
      evmAddress
        ? [toCaipAccountId(KnownCaipNamespace.Eip155, '0', evmAddress)]
        : [],
    [evmAddress],
  );

  const queryOptions =
    apiClient.accounts.getV5MultiAccountTransactionsInfiniteQueryOptions({
      accountIds,
      networks,
      includeTxMetadata: true,
    }) as QueryOptions;

  const selectFn = useMemo(
    () =>
      selectApiEvmTransactions({
        address: evmAddress,
        excludedTxHashes,
        assetId: filters?.assetId,
      }),
    [evmAddress, excludedTxHashes, filters?.assetId],
  );

  const query = useInfiniteQuery({
    ...queryOptions,
    select: selectFn,
    enabled:
      filters?.enabled !== false &&
      accountIds.length > 0 &&
      networks.length > 0,
    staleTime: 5 * MINUTE,
    retry: false,
  });

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = query;

  const fetchNextVisiblePage = useCallback(
    async (options?: { minVisibleItems?: number }) => {
      const minVisibleItems = options?.minVisibleItems ?? 1;
      if (!hasNextPage || isFetchingNextPage || minVisibleItems <= 0) {
        return Promise.resolve();
      }

      async function fetchPages() {
        let visibleItemCount =
          data?.pages.flatMap((page) => page.data).length ?? 0;
        let pageCount = data?.pages.length ?? 0;

        for (
          let pagesFetched = 0;
          pagesFetched < maxPagesPerVisibleFetch &&
          visibleItemCount < minVisibleItems;
          pagesFetched++
        ) {
          const result = await fetchNextPage();
          const pages = result.data?.pages ?? [];
          const nextPageCount = pages.length;
          if (nextPageCount <= pageCount) {
            break;
          }
          pageCount = nextPageCount;
          visibleItemCount = pages.flatMap((page) => page.data).length;
          if (!result.hasNextPage) {
            break;
          }
        }
      }

      return fetchPages().catch(() => undefined);
    },
    [data?.pages, fetchNextPage, hasNextPage, isFetchingNextPage],
  );

  return { ...query, fetchNextVisiblePage };
};
