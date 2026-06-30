import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  useInfiniteQuery,
  type UseInfiniteQueryOptions,
} from '@tanstack/react-query';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyCardActivityCashbackMultisendContracts } from '../selectors/featureFlags';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import type { AccountsApiActivity } from '../types/moneyActivity';
import {
  oldestRawActivityTime,
  parseAccountsApiActivity,
} from '../utils/accountsApi';

export interface UseMoneyAccountApiActivityResult {
  activity: AccountsApiActivity[];
  /**
   * Pagination watermark (epoch ms). Merged activity older than this may have
   * un-fetched API rows that belong above it, so it must be withheld until more
   * pages load. `Number.NEGATIVE_INFINITY` once every page has been fetched.
   */
  watermark: number;
  /** True once the last page has been fetched — the activity list is exhaustive. */
  isComplete: boolean;
  /** Number of Accounts-API pages fetched so far. */
  pageCount: number;
  /** True while more pages remain to be fetched. */
  hasMore: boolean;
  /** Fetch the next page; no-op if a fetch is in flight or none remain. */
  loadMore: () => void;
  /** True while a follow-up (non-initial) page is being fetched. */
  isLoadingMore: boolean;
  isLoading: boolean;
  error: boolean;
  refetch: () => void;
}

const EMPTY_ACTIVITY: AccountsApiActivity[] = [];
const EMPTY_PAGES: V1AccountTransactionsResponse[] = [];

const ACCOUNT_ACTIVITY_QUERY_OPTIONS = {
  chainIds: MUSD_MONEY_ACCOUNT_CHAIN_IDS,
  sortDirection: 'DESC' as const,
};

/**
 * Off-device MetaMask Card activity (spends and cashback) for the primary Money
 * account, sourced from the Accounts API via the shared {@link apiClient} (same
 * client/auth path as the unified activity list). Both kinds arrive in one
 * response — `parseAccountsApiActivity` splits them by type.
 *
 * Pages are fetched lazily (cursor-based) rather than upfront: the first page
 * backs the home preview, and `loadMore` pulls the rest as the full list is
 * scrolled. The `watermark` tells the consumer how far down the merged list is
 * complete and safe to display. React Query handles caching, dedup and
 * stale-while-revalidate refetching.
 */
export function useMoneyAccountApiActivity(): UseMoneyAccountApiActivityResult {
  const primaryMoneyAccount = useSelector(selectPrimaryMoneyAccount);
  const cashbackMultisendContracts = useSelector(
    selectMoneyCardActivityCashbackMultisendContracts,
  );
  const rawAddress = primaryMoneyAccount?.address;
  const moneyAddress = rawAddress ? toChecksumHexAddress(rawAddress) : '';
  const enabled = moneyAddress !== '';

  // Reuse the client's query key (cursor-free) so all pages share one cache
  // entry and the home preview and full list don't refetch each other's pages.
  const queryOptions = apiClient.accounts.getV1AccountTransactionsQueryOptions(
    moneyAddress,
    ACCOUNT_ACTIVITY_QUERY_OPTIONS,
  );

  // `apiClient` is built against query-core v5; this repo's react-query is v4, so
  // the query options aren't nominally compatible. The shapes match at runtime.
  const query = useInfiniteQuery({
    queryKey: queryOptions.queryKey,
    queryFn: ({ pageParam }: { pageParam?: string }) =>
      apiClient.accounts.fetchV1AccountTransactions(moneyAddress, {
        ...ACCOUNT_ACTIVITY_QUERY_OPTIONS,
        cursor: pageParam,
      }),
    getNextPageParam: (lastPage: V1AccountTransactionsResponse) =>
      lastPage.pageInfo?.hasNextPage ? lastPage.pageInfo.cursor : undefined,
    enabled,
    staleTime: 5 * MINUTE,
    retry: false,
  } as unknown as UseInfiniteQueryOptions<
    V1AccountTransactionsResponse,
    Error
  >);

  const pages = query.data?.pages ?? EMPTY_PAGES;

  // Parse at the boundary: the cache holds raw pages, the view gets activity.
  const activity = useMemo(
    () =>
      pages.length === 0
        ? EMPTY_ACTIVITY
        : pages.flatMap((page) =>
            parseAccountsApiActivity(
              page,
              moneyAddress,
              cashbackMultisendContracts,
            ),
          ),
    [pages, moneyAddress, cashbackMultisendContracts],
  );

  // "Complete" means no further pages will arrive, so the merged list can be
  // shown in full and the watermark can stop gating. That's true in three
  // terminal states:
  //   - the query is disabled (no money account) — nothing will ever be fetched;
  //   - the fetch errored (`retry: false`, so it won't recover on its own);
  //   - we've paged to the end (`hasNextPage === false`).
  // `hasNextPage` is `undefined` both before the first fetch resolves and while
  // disabled, so it can't be relied on alone — without the `!enabled`/`isError`
  // arms a disabled or errored query would withhold every row (watermark stuck
  // at `+Infinity`) and strand the view on a permanent skeleton.
  const isComplete = !enabled || query.isError || query.hasNextPage === false;
  const watermark = useMemo(
    () =>
      isComplete ? Number.NEGATIVE_INFINITY : oldestRawActivityTime(pages),
    [pages, isComplete],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = query;
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    activity,
    watermark,
    isComplete,
    pageCount: pages.length,
    hasMore: hasNextPage === true,
    loadMore,
    isLoadingMore: isFetchingNextPage,
    // `isInitialLoading` (not `isLoading`) so a disabled query never reports
    // loading and a background refetch doesn't flash the spinner.
    isLoading: query.isInitialLoading,
    error: query.isError,
    refetch: query.refetch,
  };
}
