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
  /** Fetch the next page of Accounts-API activity (for infinite scroll). */
  loadMore: () => void;
  /** True while more Accounts-API pages remain to be fetched. */
  hasMore: boolean;
  /** True while a follow-up page is being fetched (footer spinner). */
  isLoadingMore: boolean;
  /** True when the Accounts-API fetch failed — terminal until `refetch`. */
  error: boolean;
  /** Refetch the Accounts-API activity (all fetched pages, sequentially). */
  refetch: () => void;
  /**
   * True while the `fill` target bucket is empty but may still gain rows
   * (initial load, or the auto-fill still fetching). Consumers should show a
   * loading state rather than "no activity" while this holds. Derived from
   * the same predicate that drives the auto-fill effect, so it can neither
   * outlive the fetch loop nor drop while it still runs.
   */
  isSettling: boolean;
  moneyAddress: string | undefined;
  /** When true, the list shows curated demo data and rows aren't pressable. */
  mockDataEnabled: boolean;
}

/**
 * Upper bound on pages the {@link UseMoneyActivityItemsOptions.fill}
 * auto-fill will pull. Deep enough that an account whose first Money row sits
 * a few pages in isn't stranded on "no activity", but finite — a card-less
 * account with a long raw history must not sweep every page on mount. Past
 * the budget, further pages come from user-driven scroll instead.
 */
export const AUTO_FILL_MAX_PAGES = 10;

export interface UseMoneyActivityItemsOptions {
  /**
   * Keep fetching pages until `bucket` holds at least `count` safe
   * (above-watermark) rows, the activity is exhausted, or the
   * {@link AUTO_FILL_MAX_PAGES} budget is spent. The home preview fills the
   * "All" bucket to its preview size; the full activity view fills the active
   * tab's bucket to a screenful so `onEndReached` pagination can take over.
   */
  fill?: {
    bucket: MoneyActivityFilter;
    count: number;
  };
}

/**
 * Withhold merged rows at or below the Accounts-API watermark: below it there
 * may be un-fetched API rows that belong higher in the list, so showing those
 * rows now would let older activity pop in above them on the next page load.
 * The gate is strict (`>`): timestamps are second-resolution, so the next
 * un-fetched page can open with rows at exactly the watermark whose id
 * tiebreak would sort them above an already-rendered row.
 */
function safeItems(
  items: MoneyActivityItem[],
  watermark: number,
): MoneyActivityItem[] {
  if (watermark === Number.NEGATIVE_INFINITY) {
    return items;
  }
  return items.filter((item) => item.time > watermark);
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
    // Purchases is API-only, but the strict gate still applies: a fetched row
    // at exactly the watermark may have same-timestamp siblings on the next
    // page that would sort above it, so it's withheld like everything else.
    [MoneyActivityFilter.Purchases]: safeItems(
      mergeMoneyActivity([], [...cards, ...cashback, ...refunds]),
      watermark,
    ),
  };
}

/**
 * Assembles the Money activity list from its two sources (local on-chain txns +
 * Accounts-API activity), bucketed by filter tab. In mock-data mode it merges
 * curated demo activity instead and never surfaces the API loading state.
 */
export function useMoneyActivityItems({
  fill,
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
    pageCount,
    error,
    refetch,
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

  // Minimum-viable upfront fetch: pull more pages until the target bucket
  // holds `fill.count` safe rows, the activity is exhausted, or the page
  // budget is spent. `loadMore` already guards against concurrent fetches and
  // errored queries.
  const fillCount = buckets[fill?.bucket ?? MoneyActivityFilter.All].length;
  const wantsMorePages =
    fill !== undefined &&
    !mockDataEnabled &&
    hasMore &&
    fillCount < fill.count &&
    pageCount < AUTO_FILL_MAX_PAGES;
  useEffect(() => {
    if (wantsMorePages && !isLoadingMore) {
      loadMore();
    }
  }, [wantsMorePages, isLoadingMore, loadMore]);

  // An empty bucket is still settling while the initial query loads or the
  // auto-fill above may yet deliver its first row. This is the same predicate
  // the fetch effect runs on, so the two can't disagree.
  const isSettling =
    !mockDataEnabled &&
    (isLoading || (fillCount === 0 && (wantsMorePages || isLoadingMore)));

  return {
    buckets,
    loadMore,
    // Mock data is exhaustive and unpaginated — mask the live query's state.
    hasMore: hasMore && !mockDataEnabled,
    isLoadingMore: isLoadingMore && !mockDataEnabled,
    error: error && !mockDataEnabled,
    refetch,
    isSettling,
    moneyAddress,
    mockDataEnabled,
  };
}
