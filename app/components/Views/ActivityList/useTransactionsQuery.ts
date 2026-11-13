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

const MAX_EMPTY_FILTERED_PAGES_TO_SKIP = 5;

export const useTransactionsQuery = (filters?: { assetId?: CaipAssetType }) => {
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
    enabled: accountIds.length > 0 && networks.length > 0,
    staleTime: 5 * MINUTE,
    retry: false,
  });

  const fetchNextVisiblePage = useCallback(() => {
    if (!query.hasNextPage || query.isFetchingNextPage) {
      return;
    }
    async function fetchPages() {
      let visibleItemCount =
        query.data?.pages.flatMap((page) => page.data).length ?? 0;
      let pageCount = query.data?.pages.length ?? 0;
      let emptyFilteredPagesSkipped = 0;
      let result = await query.fetchNextPage();

      while (
        result.hasNextPage &&
        emptyFilteredPagesSkipped < MAX_EMPTY_FILTERED_PAGES_TO_SKIP
      ) {
        const pages = result.data?.pages ?? [];
        const nextPageCount = pages.length;
        const nextVisibleItemCount = pages.flatMap((page) => page.data).length;

        if (
          nextVisibleItemCount > visibleItemCount ||
          nextPageCount <= pageCount
        ) {
          break;
        }

        emptyFilteredPagesSkipped += 1;
        visibleItemCount = nextVisibleItemCount;
        pageCount = nextPageCount;
        result = await query.fetchNextPage();
      }
    }

    fetchPages().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    query.data?.pages,
    query.fetchNextPage,
    query.hasNextPage,
    query.isFetchingNextPage,
  ]);

  return { ...query, fetchNextVisiblePage };
};
