import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  accountsApiItem,
  cardProviderItem,
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
import { useCardTransactionIndex } from '../../Card/hooks/useCardTransactionIndex';
import { useCardCapabilities } from '../../Card/hooks/useCardCapabilities';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import {
  selectMoneyEnableCardActivityEnrichmentFlag,
  selectMoneyEnableMoneyAccountFlag,
} from '../selectors/featureFlags';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';

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
   * (initial Accounts-API load, auto-fill still fetching, or Card enrichment
   * still paging when the bucket is empty). Consumers should show a loading
   * state rather than "no activity" while this holds. Enrichment settling
   * alone does not hide an already-populated feed — declined rows and
   * merchant enrichment land in place once the index catches up.
   */
  isSettling: boolean;
  moneyAddress: string | undefined;
  /** When true, the list shows curated demo data and rows aren't pressable. */
  mockDataEnabled: boolean;
  cardEnrichmentByHash: Map<string, CardTransaction>;
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

/** Drops Accounts-API rows, keeping only locally-known on-chain activity. */
function onchainOnly(items: MoneyActivityItem[]): MoneyActivityItem[] {
  return items.filter((item) => item.kind === 'onchain');
}

/**
 * Merge local on-chain Money transactions with Accounts-API activity (card
 * spends and cashback) into a single source-tagged, time-descending list.
 */
export function mergeMoneyActivity(
  onchainTransactions: TransactionMeta[],
  apiActivity: AccountsApiActivity[],
  declinedCardTxs: CardTransaction[] = [],
): MoneyActivityItem[] {
  const apiHashes = new Set(apiActivity.map((a) => a.hash.toLowerCase()));
  const onchain = onchainTransactions
    // we ignore any on chain data that exists in the accounts API response.
    .filter((tx) => !(tx.hash && apiHashes.has(tx.hash.toLowerCase())))
    .map(onchainItem);
  // Time-descending, with `id` as a stable tiebreak so rows sharing a timestamp
  // (e.g. a spend and its cashback in the same second) keep a deterministic
  // order across renders/refetches and across the two merged sources.
  return [
    ...onchain,
    ...apiActivity.map(accountsApiItem),
    ...declinedCardTxs.map(cardProviderItem),
  ].sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
}

export function buildMoneyActivityBuckets(
  onchain: {
    all: TransactionMeta[];
    deposits: TransactionMeta[];
    transfers: TransactionMeta[];
  },
  apiActivity: AccountsApiActivity[],
  watermark: number = Number.NEGATIVE_INFINITY,
  declinedCardTxs: CardTransaction[] = [],
): MoneyActivityBuckets {
  return {
    [MoneyActivityFilter.All]: safeItems(
      mergeMoneyActivity(onchain.all, apiActivity, declinedCardTxs),
      watermark,
    ),
    // Deposits and Sends are on-chain only. API rows are still merged in so
    // their hashes dedupe any on-chain twin, then dropped from the rendered
    // rows. Declined card txs are omitted here so they only surface in All /
    // Purchases.
    [MoneyActivityFilter.Deposits]: onchainOnly(
      safeItems(mergeMoneyActivity(onchain.deposits, apiActivity), watermark),
    ),
    [MoneyActivityFilter.Transfers]: onchainOnly(
      safeItems(mergeMoneyActivity(onchain.transfers, apiActivity), watermark),
    ),
    // Purchases is API-only (+ declined card rows); the watermark gate still
    // applies for same-timestamp siblings on the next page.
    [MoneyActivityFilter.Purchases]: safeItems(
      mergeMoneyActivity([], apiActivity, declinedCardTxs),
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

  const isCardTxHistoryEnabled = useSelector(
    selectCardTransactionHistoryEnabled,
  );
  const isCardActivityEnrichmentEnabled = useSelector(
    selectMoneyEnableCardActivityEnrichmentFlag,
  );
  const isMoneyAccountEnabled = useSelector(selectMoneyEnableMoneyAccountFlag);
  const isGeoEligible = useSelector(selectIsMoneyAccountGeoEligible);
  const capabilities = useCardCapabilities();

  const enrichmentEnabled =
    !mockDataEnabled &&
    isCardTxHistoryEnabled &&
    isCardActivityEnrichmentEnabled &&
    isMoneyAccountEnabled &&
    isGeoEligible &&
    (capabilities?.supportsTransactionHistory ?? false) &&
    (capabilities?.supportsMoneyAccountLinking ?? false);

  const apiActivity = mockDataEnabled ? MOCK_API_ACTIVITY : activity;
  // Mock data is exhaustive and unpaginated: ignore the real watermark so every
  // curated row renders and `loadMore` is inert.
  const effectiveWatermark = mockDataEnabled
    ? Number.NEGATIVE_INFINITY
    : watermark;

  // While Accounts API still has pages, stop the Card index at the oldest
  // fetched API row — declines below the watermark would be withheld anyway.
  // Once API paging is exhausted the watermark opens fully (-Infinity), so
  // clear the floor and let the index continue toward Money Account launch
  // (within its page/item caps) so older declines can appear in All/Purchases.
  const oldestVisibleTime = useMemo(() => {
    if (!hasMore) {
      return undefined;
    }
    const times = apiActivity.map((a) => a.time);
    if (times.length === 0) {
      return undefined;
    }
    return Math.min(...times);
  }, [apiActivity, hasMore]);

  const {
    bySettlementHash,
    declined,
    isSettling: isEnrichmentSettling,
    isError: isEnrichmentError,
  } = useCardTransactionIndex({
    oldestVisibleTime,
    enabled: enrichmentEnabled,
  });

  const enrichmentReady = enrichmentEnabled && !isEnrichmentError;

  const declinedForFeed = useMemo(
    () => (enrichmentReady ? declined : []),
    [enrichmentReady, declined],
  );

  const emptyEnrichmentMap = useMemo(
    () => new Map<string, CardTransaction>(),
    [],
  );

  const buckets = useMemo(
    () =>
      buildMoneyActivityBuckets(
        { all: allTransactions, deposits, transfers },
        apiActivity,
        effectiveWatermark,
        declinedForFeed,
      ),
    [
      allTransactions,
      deposits,
      transfers,
      apiActivity,
      effectiveWatermark,
      declinedForFeed,
    ],
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

  // An empty bucket is still settling while the initial query loads, the
  // auto-fill above may yet deliver its first row, or Card enrichment may
  // still inject a declined row. Once any row is on screen, leave the feed
  // visible — enrichment updates land in place.
  const isSettling =
    !mockDataEnabled &&
    (isLoading ||
      (fillCount === 0 &&
        ((enrichmentEnabled && isEnrichmentSettling) ||
          wantsMorePages ||
          isLoadingMore)));

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
    cardEnrichmentByHash: enrichmentReady
      ? bySettlementHash
      : emptyEnrichmentMap,
  };
}
