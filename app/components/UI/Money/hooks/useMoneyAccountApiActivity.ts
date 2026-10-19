import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import type { V1AccountTransactionsResponse } from '@metamask/core-backend';
import { apiClient } from '../../../../core/apiClient';
import {
  annotateTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectPrimaryMoneyAccount } from '../../../../selectors/moneyAccountController';
import { selectMoneyCardActivityCashbackMultisendContracts } from '../selectors/featureFlags';
import { selectMoneyAccountVaultConfig } from '../../../../selectors/featureFlagController/moneyAccount';
import { selectMoneyAccountVedaTokenConfig } from '../../../../selectors/cardController';
import { MUSD_MONEY_ACCOUNT_CHAIN_IDS } from '../../Earn/constants/musd';
import { MINUTE } from '../../../../constants/time';
import Engine from '../../../../core/Engine';
import type { AccountsApiActivity } from '../types/moneyActivity';
import {
  oldestRawActivityTime,
  parseAccountsApiActivity,
} from '../utils/accountsApi';
import {
  readCachedFirstPage,
  writeCachedFirstPage,
} from '../utils/moneyActivityCache';
import {
  fetchCardSpendRateHistory,
  selectHistoricalRateForBlock,
} from './moneyAccountCardSpendRate';
import { MoneyAccountApiDataServiceQueryKeys } from '../queryKeys';

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
  const vaultConfig = useSelector(selectMoneyAccountVaultConfig);
  const vedaTokenConfig = useSelector(selectMoneyAccountVedaTokenConfig);
  const rawAddress = primaryMoneyAccount?.address;
  const moneyAddress = rawAddress ? toChecksumHexAddress(rawAddress) : '';
  const enabled = moneyAddress !== '';

  // Reuse the client's query key (cursor-free) so all pages share one cache
  // entry and the home preview and full list don't refetch each other's pages.
  const queryOptions = apiClient.accounts.getV1AccountTransactionsQueryOptions(
    moneyAddress,
    ACCOUNT_ACTIVITY_QUERY_OPTIONS,
  );

  // `initialDataUpdatedAt` carries the write time, so the `staleTime` below
  // still decides whether a background refetch runs — the freshness policy is
  // unchanged, only the starting point.
  const cachedFirstPage = useMemo(
    () => (enabled ? readCachedFirstPage(moneyAddress) : undefined),
    [enabled, moneyAddress],
  );

  const query = useInfiniteQuery({
    queryKey: queryOptions.queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      // `useMoneyActivityItems` auto-fills pages serially, so `is_initial_page`
      // separates the request gating time-to-content from those behind it.
      const page = await trace(
        {
          name: TraceName.MoneyActivityFetch,
          op: TraceOperation.MoneyAccountDataFetch,
          tags: { is_initial_page: pageParam === undefined },
        },
        async (context) => {
          const response = await apiClient.accounts.fetchV1AccountTransactions(
            moneyAddress,
            {
              ...ACCOUNT_ACTIVITY_QUERY_OPTIONS,
              cursor: pageParam,
            },
          );
          annotateTrace(context, {
            row_count: response.data?.length ?? 0,
            has_next_page: response.pageInfo?.hasNextPage ?? false,
          });
          return response;
        },
      );

      // Outside the span: serialising is our cost, not the request's, and
      // folding it in would inflate the metric the span exists to measure.
      if (pageParam === undefined) {
        writeCachedFirstPage(moneyAddress, page);
      }
      return page;
    },
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
    initialData: cachedFirstPage
      ? { pages: [cachedFirstPage.page], pageParams: [undefined] }
      : undefined,
    initialDataUpdatedAt: cachedFirstPage?.cachedAt,
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

  const configuredChainId = vaultConfig
    ? vaultConfig.chainId.startsWith('0x')
      ? Number.parseInt(vaultConfig.chainId, 16)
      : Number(vaultConfig.chainId)
    : NaN;
  const isConfiguredVaultShare = useCallback(
    (
      row: AccountsApiActivity,
    ): row is Extract<AccountsApiActivity, { kind: 'card' }> =>
      row.kind === 'card' &&
      row.token.address.toLowerCase() ===
        vedaTokenConfig?.address.toLowerCase() &&
      row.token.decimals === 6,
    [vedaTokenConfig?.address],
  );
  const vaultCardActivities = useMemo(
    () =>
      activity.filter(
        (row) =>
          isConfiguredVaultShare(row) &&
          row.chainId.toLowerCase() === vaultConfig?.chainId.toLowerCase(),
      ),
    [activity, isConfiguredVaultShare, vaultConfig?.chainId],
  );
  const rateActivities = useMemo(
    () => vaultCardActivities.filter((row) => row.blockNumber !== undefined),
    [vaultCardActivities],
  );
  const rateHistoryEnabled = Boolean(
    rateActivities.length > 0 &&
      vaultConfig?.boringVault &&
      Number.isSafeInteger(configuredChainId),
  );
  const rateQueryKey = useMemo(
    () => [
      MoneyAccountApiDataServiceQueryKeys.FETCH_RATE_HISTORY,
      vaultConfig?.boringVault ?? '',
      {
        chainId: configuredChainId,
        from: rateActivities.length
          ? new Date(
              Math.min(...rateActivities.map(({ time }) => time)) -
                365 * 24 * 60 * 60 * 1000,
            ).toISOString()
          : '',
        to: rateActivities.length
          ? new Date(
              Math.min(
                Math.max(...rateActivities.map(({ time }) => time)),
                Date.now(),
              ) +
                24 * 60 * 60 * 1000,
            ).toISOString()
          : '',
      },
    ],
    [configuredChainId, rateActivities, vaultConfig?.boringVault],
  );
  const rateHistoryQuery = useQuery({
    queryKey: rateQueryKey,
    queryFn: () =>
      fetchCardSpendRateHistory(
        (vaultAddress, options) =>
          Engine.controllerMessenger.call(
            'MoneyAccountApiDataService:fetchRateHistory',
            vaultAddress,
            options,
          ),
        vaultConfig?.boringVault ?? '',
        configuredChainId,
        rateActivities.map(({ blockNumber, time }) => ({
          blockNumber,
          time,
        })),
      ),
    enabled: rateHistoryEnabled,
    staleTime: 5 * MINUTE,
    retry: false,
    placeholderData: (previousData, previousQuery) => {
      const previousQueryKey = previousQuery?.queryKey;
      const previousScope = previousQueryKey?.[2] as
        | { chainId?: number }
        | undefined;
      const sameVaultAndChain =
        previousQueryKey?.[0] === rateQueryKey[0] &&
        previousQueryKey?.[1] === rateQueryKey[1] &&
        previousScope?.chainId === configuredChainId;
      return sameVaultAndChain ? previousData : undefined;
    },
  });

  const resolvedActivity = useMemo(() => {
    const rates = rateHistoryQuery.data ?? [];
    return activity.map((row) => {
      if (
        !isConfiguredVaultShare(row) ||
        row.chainId.toLowerCase() !== vaultConfig?.chainId.toLowerCase()
      ) {
        return row;
      }
      const historicalRate = selectHistoricalRateForBlock(
        rates,
        row.blockNumber,
      );
      return {
        ...row,
        isVaultShare: true,
        ...(rateHistoryQuery.data ? { historicalRate } : {}),
      };
    });
  }, [
    activity,
    rateHistoryQuery.data,
    isConfiguredVaultShare,
    vaultConfig?.chainId,
  ]);

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
    activity: resolvedActivity,
    watermark,
    isComplete,
    pageCount: pages.length,
    hasMore: hasNextPage === true && !isError,
    loadMore,
    isLoadingMore: isFetchingNextPage,
    isLoading: query.isLoading,
    error: query.isError,
    refetch: query.refetch,
  };
}
