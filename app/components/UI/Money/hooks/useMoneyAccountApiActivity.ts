import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useInfiniteQuery } from '@tanstack/react-query';
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
   * Pagination watermark in epoch ms. Merged activity older than this may have
   * un-fetched API rows that belong above it, so we withhold until more
   * pages load. Once all data has been fetched we set this to `Number.NEGATIVE_INFINITY`
   */
  watermark: number;
  /** True once the last page has been fetched — the activity list is exhaustive. */
  isComplete: boolean;
  /** Number of Accounts-API pages fetched so far. */
  pageCount: number;
  /** True while more pages remain to be fetched (false once the query errors). */
  hasMore: boolean;
  /**
   * Fetch the next page; no-op if a fetch is in flight, none remain, or the
   * query errored (use `refetch` to recover from an error).
   */
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
 * Pages are fetched as we need them: the first page
 * backs the home preview, and `loadMore` pulls the rest as the full list is
 * scrolled. The `watermark` tells the consumer how far down the merged list is
 * complete and safe to display.
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

  const query = useInfiniteQuery({
    queryKey: queryOptions.queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      apiClient.accounts.fetchV1AccountTransactions(moneyAddress, {
        ...ACCOUNT_ACTIVITY_QUERY_OPTIONS,
        cursor: pageParam,
      }),
    // Guard the cursor too: react-query only stops on `undefined`, so a
    // malformed page with `hasNextPage: true` but an empty cursor would
    // otherwise refetch the first page in a loop.
    getNextPageParam: (lastPage: V1AccountTransactionsResponse) =>
      lastPage.pageInfo?.hasNextPage && lastPage.pageInfo.cursor
        ? lastPage.pageInfo.cursor
        : undefined,
    enabled,
    staleTime: 5 * MINUTE,
    retry: false,
  });

  const pages = query.data?.pages ?? EMPTY_PAGES;

  const activity = useMemo(() => {
    if (pages.length === 0) {
      return EMPTY_ACTIVITY;
    }
    // Dedupe across page boundaries: if the API cursor is ever inclusive (the
    // last row of one page repeated as the first of the next), the duplicate
    // would otherwise render twice and collide on the list's `id` key.
    const seen = new Set<string>();
    return pages
      .flatMap((page) =>
        parseAccountsApiActivity(
          page,
          moneyAddress,
          cashbackMultisendContracts,
        ),
      )
      .filter((row) => {
        const key = `${row.kind}:${row.hash.toLowerCase()}`;
        if (seen.has(key)) {
          return false;
        }
        seen.add(key);
        return true;
      });
  }, [pages, moneyAddress, cashbackMultisendContracts]);

  // "Complete" means no further pages will arrive, so the merged list can be
  // shown in full. This happens if:
  //   - the query is disabled (no money account) — nothing will ever be fetched;
  //   - the fetch errored (`retry: false`, so it won't recover on its own);
  //   - we've paged to the end (`hasNextPage === false`).
  const isComplete = !enabled || query.isError || query.hasNextPage === false;
  const watermark = useMemo(
    () =>
      isComplete ? Number.NEGATIVE_INFINITY : oldestRawActivityTime(pages),
    [pages, isComplete],
  );

  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError } = query;
  // An errored query is terminal (`retry: false`), but `hasNextPage` is derived
  // from the last *successful* page and stays true — without the `isError`
  // guards every pagination driver (fill effects, onEndReached) would re-issue
  // the failed request in a loop. Recovery is via the explicit `refetch`.
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  return {
    activity,
    watermark,
    isComplete,
    pageCount: pages.length,
    hasMore: hasNextPage === true && !isError,
    loadMore,
    isLoadingMore: isFetchingNextPage,
    // isLoading is false for disabled queries and background refetches in v5.
    isLoading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
  };
}
