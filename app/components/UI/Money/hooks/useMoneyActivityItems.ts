import { useCallback, useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { TransactionMeta } from '@metamask/transaction-controller';
import {
  accountsApiItem,
  cardProviderItem,
  microdepositItem,
  neobankItem,
  onchainItem,
  type AccountsApiActivity,
  type MicrodepositActivity,
  type MoneyActivityItem,
  type NeobankBankTransferActivity,
} from '../types/moneyActivity';
import { MoneyActivityFilter } from '../constants/moneyActivity';
import { useMoneyAccountTransactions } from './useMoneyAccountTransactions';
import { useMoneyAccountApiActivity } from './useMoneyAccountApiActivity';
import { useMoneyVbaTransfers } from './useMoneyVbaTransfers';
import { useMoneyMicrodeposits } from './useMoneyMicrodeposits';
import {
  selectMoneyEnableCardActivityEnrichmentFlag,
  selectMoneyEnableMoneyAccountFlag,
  selectMoneyVbaCompletedActivityEnabled,
  selectMoneyVbaPendingActivityEnabled,
} from '../selectors/featureFlags';
import { useCardTransactionIndex } from '../../Card/hooks/useCardTransactionIndex';
import { useCardCapabilities } from '../../Card/hooks/useCardCapabilities';
import { selectCardTransactionHistoryEnabled } from '../../../../selectors/featureFlagController/card';
import { selectIsMoneyAccountGeoEligible } from '../selectors/eligibility';
import type { CardTransaction } from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  isNeobankPendingStatus,
  isNeobankVisibleActivityStatus,
} from '../utils/neobankActivity';
import { mapMoneyVbaTransfers } from '../utils/moneyVbaTransfers';

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

const EMPTY_API_ACTIVITY: AccountsApiActivity[] = [];
const EMPTY_NEOBANK_ACTIVITY: NeobankBankTransferActivity[] = [];

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
 * tiebreak would sort them above an already-rendered row. In-flight VBA rows
 * are exempt: they are pinned at the top of the list, so the gate cannot
 * reorder them, and withholding one would hide a deposit already known to be
 * in progress. Microdeposits are exempt too: their list is fetched whole, so
 * there is no un-fetched page they could pop in above.
 */
function safeItems(
  items: MoneyActivityItem[],
  watermark: number,
): MoneyActivityItem[] {
  if (watermark === Number.NEGATIVE_INFINITY) {
    return items;
  }
  return items.filter(
    (item) =>
      item.time > watermark ||
      (item.kind === 'neobank' && isNeobankPendingStatus(item.tx.status)) ||
      item.kind === 'microdeposit',
  );
}

/** Drops Accounts-API rows, keeping only locally-known on-chain activity. */
function onchainOnly(items: MoneyActivityItem[]): MoneyActivityItem[] {
  return items.filter((item) => item.kind === 'onchain');
}

/**
 * Merge local on-chain Money transactions with Accounts-API activity,
 * completed/in-flight VBA API transfers, and bank microdeposits into a single
 * source-tagged, time-descending list.
 */
export function mergeMoneyActivity(
  onchainTransactions: TransactionMeta[],
  apiActivity: AccountsApiActivity[],
  declinedCardTxs: CardTransaction[] = [],
  neobankActivity: NeobankBankTransferActivity[] = [],
  microdeposits: readonly MicrodepositActivity[] = [],
): MoneyActivityItem[] {
  const apiHashes = new Set(apiActivity.map((a) => a.hash.toLowerCase()));
  const onchainHashes = new Set(
    onchainTransactions
      .map((tx) => tx.hash?.toLowerCase())
      .filter((hash): hash is string => Boolean(hash)),
  );
  const onchain = onchainTransactions
    // Any API match is rendered from its richer data-service activity row.
    .filter((tx) => !tx.hash || !apiHashes.has(tx.hash.toLowerCase()))
    .map(onchainItem);
  const seenNeoBankIds = new Set<string>();
  const neobank = neobankActivity
    .filter((item) => isNeobankVisibleActivityStatus(item.status))
    // A settlement hash can already be rendered from the richer Accounts-API
    // row (including a completed VBA transfer), so dedupe against both sets.
    .filter(
      (item) =>
        !item.transactionHash ||
        (!onchainHashes.has(item.transactionHash.toLowerCase()) &&
          !apiHashes.has(item.transactionHash.toLowerCase())),
    )
    .filter((item) => {
      if (seenNeoBankIds.has(item.id)) {
        return false;
      }
      seenNeoBankIds.add(item.id);
      return true;
    })
    .map(neobankItem);
  // Time-descending, with `id` as a stable tiebreak so rows sharing a timestamp
  // (e.g. a spend and its cashback in the same second) keep a deterministic
  // order across renders/refetches and across the two merged sources.
  return [
    ...onchain,
    ...apiActivity.map(accountsApiItem),
    ...declinedCardTxs.map(cardProviderItem),
    ...neobank,
    ...microdeposits.map(microdepositItem),
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
  neobankActivity: NeobankBankTransferActivity[] = [],
  microdeposits: readonly MicrodepositActivity[] = [],
): MoneyActivityBuckets {
  return {
    [MoneyActivityFilter.All]: safeItems(
      mergeMoneyActivity(
        onchain.all,
        apiActivity,
        declinedCardTxs,
        neobankActivity,
        microdeposits,
      ),
      watermark,
    ),
    // Deposits: on-chain deposits plus completed or in-flight VBA transfers
    // and bank microdeposits. Other API kinds are merged only to dedupe
    // hashes, then dropped. Declined card txs stay on All / Purchases.
    [MoneyActivityFilter.Deposits]: safeItems(
      mergeMoneyActivity(
        onchain.deposits,
        apiActivity,
        [],
        neobankActivity,
        microdeposits,
      ).filter(
        (item) =>
          item.kind === 'onchain' ||
          item.kind === 'neobank' ||
          item.kind === 'microdeposit' ||
          (item.kind === 'accountsApi' && item.tx.kind === 'bank_transfer'),
      ),
      watermark,
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
 * Assembles the Money activity list from local on-chain transactions and API
 * activity, bucketed by filter tab.
 */
export function useMoneyActivityItems({
  fill,
}: UseMoneyActivityItemsOptions = {}): UseMoneyActivityItemsResult {
  const { allTransactions, deposits, transfers, moneyAddress } =
    useMoneyAccountTransactions();
  const {
    activity,
    isLoading,
    watermark,
    hasMore,
    loadMore,
    isLoadingMore,
    pageCount,
    error,
    refetch: refetchApiActivity,
  } = useMoneyAccountApiActivity();
  const pendingActivityEnabled = useSelector(
    selectMoneyVbaPendingActivityEnabled,
  );
  const completedActivityEnabled = useSelector(
    selectMoneyVbaCompletedActivityEnabled,
  );
  const {
    data: vbaTransfersResponse,
    isLoading: isVbaTransfersLoading,
    refetch: refetchVbaTransfers,
  } = useMoneyVbaTransfers();
  const {
    microdeposits,
    isLoading: isMicrodepositsLoading,
    refetch: refetchMicrodeposits,
  } = useMoneyMicrodeposits(moneyAddress);
  const mappedVbaTransfers = useMemo(
    () =>
      moneyAddress
        ? mapMoneyVbaTransfers(
            vbaTransfersResponse?.transfers ?? [],
            moneyAddress,
          )
        : { completed: [], pending: [], failed: [] },
    [moneyAddress, vbaTransfersResponse],
  );
  const completedVbaActivity = useMemo(
    () =>
      completedActivityEnabled
        ? mappedVbaTransfers.completed
        : EMPTY_API_ACTIVITY,
    [completedActivityEnabled, mappedVbaTransfers.completed],
  );
  // A completed VBA row is stamped with its event time, which can sit below the
  // Accounts-API watermark while its on-chain settlement is newer. Merging it
  // would drop that local row as a duplicate, and `safeItems` would then
  // withhold the VBA row too, hiding the deposit from every bucket.
  const mergeableCompletedVbaActivity = useMemo(
    () => completedVbaActivity.filter((item) => item.time > watermark),
    [completedVbaActivity, watermark],
  );
  const visibleVbaActivity = useMemo(
    () =>
      pendingActivityEnabled
        ? [...mappedVbaTransfers.pending, ...mappedVbaTransfers.failed].filter(
            (item) => isNeobankVisibleActivityStatus(item.status),
          )
        : EMPTY_NEOBANK_ACTIVITY,
    [
      mappedVbaTransfers.failed,
      mappedVbaTransfers.pending,
      pendingActivityEnabled,
    ],
  );

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
    isCardTxHistoryEnabled &&
    isCardActivityEnrichmentEnabled &&
    isMoneyAccountEnabled &&
    isGeoEligible &&
    (capabilities?.supportsTransactionHistory ?? false) &&
    (capabilities?.supportsMoneyAccountLinking ?? false);

  // While Accounts API still has pages, stop the Card index at the oldest
  // fetched API row — declines below the watermark would be withheld anyway.
  // Once API paging is exhausted the watermark opens fully (-Infinity), so
  // clear the floor and let the index continue toward Money Account launch
  // (within its page/item caps) so older declines can appear in All/Purchases.
  const oldestVisibleTime = useMemo(() => {
    if (!hasMore) {
      return undefined;
    }
    const times = activity.map((a) => a.time);
    if (times.length === 0) {
      return undefined;
    }
    return Math.min(...times);
  }, [activity, hasMore]);

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
        [...activity, ...mergeableCompletedVbaActivity],
        watermark,
        declinedForFeed,
        visibleVbaActivity,
        microdeposits,
      ),
    [
      allTransactions,
      deposits,
      transfers,
      activity,
      mergeableCompletedVbaActivity,
      watermark,
      declinedForFeed,
      visibleVbaActivity,
      microdeposits,
    ],
  );

  const refetch = useCallback(() => {
    refetchApiActivity();
    if (completedActivityEnabled || pendingActivityEnabled) {
      refetchVbaTransfers().catch(() => undefined);
    }
    refetchMicrodeposits();
  }, [
    completedActivityEnabled,
    pendingActivityEnabled,
    refetchApiActivity,
    refetchVbaTransfers,
    refetchMicrodeposits,
  ]);

  // Minimum-viable upfront fetch: pull more pages until the target bucket
  // holds `fill.count` safe rows, the activity is exhausted, or the page
  // budget is spent. `loadMore` already guards against concurrent fetches and
  // errored queries.
  const fillCount = buckets[fill?.bucket ?? MoneyActivityFilter.All].length;
  const wantsMorePages =
    fill !== undefined &&
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
    isLoading ||
    (fillCount === 0 &&
      ((enrichmentEnabled && isEnrichmentSettling) ||
        ((completedActivityEnabled || pendingActivityEnabled) &&
          isVbaTransfersLoading) ||
        isMicrodepositsLoading ||
        wantsMorePages ||
        isLoadingMore));

  return {
    buckets,
    loadMore,
    hasMore,
    isLoadingMore,
    error,
    refetch,
    isSettling,
    moneyAddress,
    cardEnrichmentByHash: enrichmentReady
      ? bySettlementHash
      : emptyEnrichmentMap,
  };
}
