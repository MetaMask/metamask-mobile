import { useEffect, useMemo } from 'react';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  accountsApiItem,
  onchainItem,
  type AccountsApiActivity,
  type MoneyActivityItem,
} from '../types/moneyActivity';
import {
  MoneyActivityFilter,
  MOCK_API_ACTIVITY,
} from '../constants/mockActivityData';
import { useMoneyAccountTransactions } from './useMoneyAccountTransactions';
import { useMoneyAccountApiActivity } from './useMoneyAccountApiActivity';

/** The list shown for each activity filter tab. */
export type MoneyActivityBuckets = Record<
  MoneyActivityFilter,
  MoneyActivityItem[]
>;

export interface UseMoneyActivityItemsResult {
  buckets: MoneyActivityBuckets;
  isLoading: boolean;
  /** Fetch the next page of Accounts-API activity (for infinite scroll). */
  loadMore: () => void;
  /** True while more Accounts-API pages remain to be fetched. */
  hasMore: boolean;
  /** True once every page is fetched — the list is exhaustive (empty == truly empty). */
  isComplete: boolean;
  /** True while a follow-up page is being fetched (footer spinner). */
  isLoadingMore: boolean;
  moneyAddress: string | undefined;
  /** When true, the list shows curated demo data and rows aren't pressable. */
  mockDataEnabled: boolean;
}

/**
 * Upper bound on pages the {@link UseMoneyActivityItemsOptions.ensureCount}
 * auto-fill will pull once at least one row is on screen. Stops a sparse Money
 * account with a long unrelated on-chain history from sweeping every page on
 * mount; further pages then come from user-driven scroll instead.
 */
export const AUTO_FILL_MAX_PAGES = 3;

export interface UseMoneyActivityItemsOptions {
  /**
   * Keep fetching pages until the "All" bucket holds at least this many safe
   * (below-watermark-excluded) rows or the activity is exhausted. Used by the
   * home preview to fetch the minimum viable amount upfront; the full list
   * leaves this unset and paginates on scroll instead.
   */
  ensureCount?: number;
}

/**
 * Withhold merged rows older than the Accounts-API watermark: below it there
 * may be un-fetched API rows that belong higher in the list, so showing those
 * rows now would let older activity pop in above them on the next page load.
 */
function safeItems(
  items: MoneyActivityItem[],
  watermark: number,
): MoneyActivityItem[] {
  if (watermark === Number.NEGATIVE_INFINITY) {
    return items;
  }
  return items.filter((item) => item.time >= watermark);
}

/**
 * Merge local on-chain Money transactions with Accounts-API activity (card
 * spends and cashback) into a single source-tagged, time-descending list.
 */
export function mergeMoneyActivity(
  onchainTransactions: TransactionMeta[],
  apiActivity: AccountsApiActivity[],
): MoneyActivityItem[] {
  const apiHashes = new Set(apiActivity.map((a) => a.hash.toLowerCase()));
  const onchain = onchainTransactions
    // we ignore any on chain data that exists in the accounts API response.
    .filter((tx) => !(tx.hash && apiHashes.has(tx.hash.toLowerCase())))
    .map(onchainItem);
  // Time-descending, with `id` as a stable tiebreak so rows sharing a timestamp
  // (e.g. a spend and its cashback in the same second) keep a deterministic
  // order across renders/refetches and across the two merged sources.
  return [...onchain, ...apiActivity.map(accountsApiItem)].sort(
    (a, b) => b.time - a.time || a.id.localeCompare(b.id),
  );
}

export function buildMoneyActivityBuckets(
  onchain: {
    all: TransactionMeta[];
    deposits: TransactionMeta[];
    transfers: TransactionMeta[];
  },
  apiActivity: AccountsApiActivity[],
  watermark: number = Number.NEGATIVE_INFINITY,
): MoneyActivityBuckets {
  const cards = apiActivity.filter((a) => a.kind === 'card');
  const cashback = apiActivity.filter((a) => a.kind === 'cashback');
  const refunds = apiActivity.filter((a) => a.kind === 'refund');
  return {
    [MoneyActivityFilter.All]: safeItems(
      mergeMoneyActivity(onchain.all, apiActivity),
      watermark,
    ),
    [MoneyActivityFilter.Deposits]: safeItems(
      mergeMoneyActivity(onchain.deposits, cashback),
      watermark,
    ),
    [MoneyActivityFilter.Transfers]: safeItems(
      mergeMoneyActivity(onchain.transfers, cards),
      watermark,
    ),
    [MoneyActivityFilter.Purchases]: mergeMoneyActivity(
      [],
      [...cards, ...cashback, ...refunds],
    ),
  };
}

/**
 * Assembles the Money activity list from its two sources (local on-chain txns +
 * Accounts-API activity), bucketed by filter tab. In mock-data mode it merges
 * curated demo activity instead and never surfaces the API loading state.
 */
export function useMoneyActivityItems({
  ensureCount,
}: UseMoneyActivityItemsOptions = {}): UseMoneyActivityItemsResult {
  const {
    allTransactions,
    deposits,
    transfers,
    moneyAddress,
    mockDataEnabled,
  } = useMoneyAccountTransactions();
  const {
    activity,
    isLoading,
    watermark,
    hasMore,
    loadMore,
    isLoadingMore,
    isComplete: apiIsComplete,
    pageCount,
  } = useMoneyAccountApiActivity();

  const apiActivity = mockDataEnabled ? MOCK_API_ACTIVITY : activity;
  // Mock data is exhaustive and unpaginated: ignore the real watermark so every
  // curated row renders and `loadMore` is inert.
  const effectiveWatermark = mockDataEnabled
    ? Number.NEGATIVE_INFINITY
    : watermark;

  const buckets = useMemo(
    () =>
      buildMoneyActivityBuckets(
        { all: allTransactions, deposits, transfers },
        apiActivity,
        effectiveWatermark,
      ),
    [allTransactions, deposits, transfers, apiActivity, effectiveWatermark],
  );

  // Minimum-viable upfront fetch: pull more pages until the "All" bucket holds
  // `ensureCount` safe rows or the activity is exhausted. `loadMore` already
  // guards against concurrent fetches.
  //
  // The page budget keeps this bounded once something is on screen, but never
  // while the list is still empty: an empty-but-incomplete list keeps fetching
  // (capped only by `hasMore`) so we never strand the user on a spinner when
  // their first row sits deep in the pages.
  const allCount = buckets[MoneyActivityFilter.All].length;
  useEffect(() => {
    const withinPageBudget = allCount === 0 || pageCount < AUTO_FILL_MAX_PAGES;
    if (
      ensureCount !== undefined &&
      !mockDataEnabled &&
      hasMore &&
      !isLoadingMore &&
      allCount < ensureCount &&
      withinPageBudget
    ) {
      loadMore();
    }
  }, [
    ensureCount,
    mockDataEnabled,
    hasMore,
    isLoadingMore,
    allCount,
    pageCount,
    loadMore,
  ]);

  return {
    buckets,
    // Mock mode shows curated demo data only — never surface real API loading.
    isLoading: isLoading && !mockDataEnabled,
    loadMore,
    hasMore: hasMore && !mockDataEnabled,
    // Mock data is exhaustive: an empty mock list is genuinely empty.
    isComplete: mockDataEnabled || apiIsComplete,
    isLoadingMore: isLoadingMore && !mockDataEnabled,
    moneyAddress,
    mockDataEnabled,
  };
}
