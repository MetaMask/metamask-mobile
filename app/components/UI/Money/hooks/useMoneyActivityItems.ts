import { useMemo } from 'react';
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
  moneyAddress: string | undefined;
  /** When true, the list shows curated demo data and rows aren't pressable. */
  mockDataEnabled: boolean;
}

/**
 * Merge local on-chain Money transactions with Accounts-API activity (card
 * spends and cashback) into a single source-tagged, time-descending list.
 *
 * The Accounts-API rows are authoritative for any hash they cover, so an
 * on-chain row sharing a hash is dropped to avoid double-rendering the
 * settlement leg.
 */
export function mergeMoneyActivity(
  onchainTransactions: TransactionMeta[],
  apiActivity: AccountsApiActivity[],
): MoneyActivityItem[] {
  const apiHashes = new Set(apiActivity.map((a) => a.hash.toLowerCase()));
  const onchain = onchainTransactions
    .filter((tx) => !(tx.hash && apiHashes.has(tx.hash.toLowerCase())))
    .map(onchainItem);
  return [...onchain, ...apiActivity.map(accountsApiItem)].sort(
    (a, b) => b.time - a.time,
  );
}

/**
 * The single place that decides which source lands in which filter tab: card
 * spends are outflows → Transfers; cashback credits are inflows → Deposits; both
 * appear in All.
 */
export function buildMoneyActivityBuckets(
  onchain: {
    all: TransactionMeta[];
    deposits: TransactionMeta[];
    transfers: TransactionMeta[];
  },
  apiActivity: AccountsApiActivity[],
): MoneyActivityBuckets {
  const cards = apiActivity.filter((a) => a.kind === 'card');
  const cashback = apiActivity.filter((a) => a.kind === 'cashback');
  return {
    [MoneyActivityFilter.All]: mergeMoneyActivity(onchain.all, apiActivity),
    [MoneyActivityFilter.Deposits]: mergeMoneyActivity(
      onchain.deposits,
      cashback,
    ),
    [MoneyActivityFilter.Transfers]: mergeMoneyActivity(
      onchain.transfers,
      cards,
    ),
  };
}

/**
 * Assembles the Money activity list from its two sources (local on-chain txns +
 * Accounts-API activity), bucketed by filter tab. In mock-data mode it merges
 * curated demo activity instead and never surfaces the API loading state.
 */
export function useMoneyActivityItems(): UseMoneyActivityItemsResult {
  const {
    allTransactions,
    deposits,
    transfers,
    moneyAddress,
    mockDataEnabled,
  } = useMoneyAccountTransactions();
  const { activity, isLoading } = useMoneyAccountApiActivity();

  const apiActivity = mockDataEnabled ? MOCK_API_ACTIVITY : activity;

  const buckets = useMemo(
    () =>
      buildMoneyActivityBuckets(
        { all: allTransactions, deposits, transfers },
        apiActivity,
      ),
    [allTransactions, deposits, transfers, apiActivity],
  );

  return {
    buckets,
    // Mock mode shows curated demo data only — never surface real API loading.
    isLoading: isLoading && !mockDataEnabled,
    moneyAddress,
    mockDataEnabled,
  };
}
