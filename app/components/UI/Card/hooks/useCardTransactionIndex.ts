import { useEffect, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { MONEY_ACCOUNT_LAUNCH_MS } from '../../../../core/Engine/controllers/card-controller/types';
import {
  CardTransactionStatus,
  type CardTransaction,
  type CardTransactionPage,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import {
  selectCardActiveProviderId,
  selectCardProviderUserId,
  selectIsCardAuthenticated,
} from '../../../../selectors/cardController';
import { isMoneyAccountCardTransaction } from '../utils/moneyAccountCardTransaction';
import { cardQueries } from '../queries';

export const CARD_TX_INDEX_MAX_PAGES = 5;
export const CARD_TX_INDEX_MAX_ITEMS = 300;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

export interface UseCardTransactionIndexOptions {
  oldestVisibleTime?: number;
  enabled?: boolean;
}

export interface UseCardTransactionIndexResult {
  bySettlementHash: Map<string, CardTransaction>;
  declined: CardTransaction[];
  oldestFetchedTime: number;
  isFetching: boolean;
  isSettling: boolean;
  isError: boolean;
}

export function isSettledCardTransaction(tx: CardTransaction): boolean {
  return tx.fundingSources.some((fs) => Boolean(fs.txHash));
}

export function settlementHashesForCardTransaction(
  tx: CardTransaction,
): string[] {
  return tx.fundingSources
    .map((fs) => fs.txHash?.toLowerCase())
    .filter((h): h is string => Boolean(h));
}

export function classifyCardTransactionsForIndex(items: CardTransaction[]): {
  bySettlementHash: Map<string, CardTransaction>;
  declined: CardTransaction[];
} {
  const bySettlementHash = new Map<string, CardTransaction>();
  const declined: CardTransaction[] = [];
  for (const tx of items) {
    if (isSettledCardTransaction(tx)) {
      for (const hash of settlementHashesForCardTransaction(tx)) {
        bySettlementHash.set(hash, tx);
      }
      continue;
    }
    // Only failed txs are declines. Pending/completed/reversed without a hash
    // must not enter the declined feed (e.g. pending Money Account auths).
    if (tx.status === CardTransactionStatus.Failed) {
      declined.push(tx);
    }
  }
  return { bySettlementHash, declined };
}

export function useCardTransactionIndex({
  oldestVisibleTime,
  enabled = true,
}: UseCardTransactionIndexOptions = {}): UseCardTransactionIndexResult {
  const queryClient = useQueryClient();
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const providerId = useSelector(selectCardActiveProviderId);
  const providerUserId = useSelector(selectCardProviderUserId);
  // Existing production Card auth tokens predate providerUserId. Keep those
  // users isolated by provider until their next login stores the stable ID.
  const transactionCacheUserId = providerUserId ?? 'legacy';
  const cardController = Engine.context?.CardController;
  const queryEnabled = Boolean(
    enabled && cardController && isAuthenticated && providerId,
  );

  useEffect(() => {
    if (!isAuthenticated) {
      queryClient.removeQueries({
        queryKey: cardQueries.transactions.keys.all(),
      });
    }
  }, [isAuthenticated, queryClient]);

  const query = useInfiniteQuery({
    queryKey: cardQueries.transactions.keys.index(
      providerId,
      transactionCacheUserId,
    ),
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      if (!cardController) {
        throw new Error('CardController not available');
      }
      return cardController.listTransactions({
        limit: 50,
        cursor: pageParam,
        fromDate: MONEY_ACCOUNT_LAUNCH_MS,
        toDate: Date.now(),
      });
    },
    getNextPageParam: (lastPage: CardTransactionPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: queryEnabled,
  });

  const allItems = useMemo(
    () =>
      queryEnabled
        ? (query.data?.pages.flatMap((page) => page.items) ?? [])
        : [],
    [queryEnabled, query.data],
  );

  const oldestFetchedTime = useMemo(() => {
    if (allItems.length === 0) {
      return Number.POSITIVE_INFINITY;
    }
    return Math.min(...allItems.map((tx) => tx.timestamp));
  }, [allItems]);

  const targetFloor =
    oldestVisibleTime != null
      ? Math.max(oldestVisibleTime - CLOCK_SKEW_MS, MONEY_ACCOUNT_LAUNCH_MS)
      : MONEY_ACCOUNT_LAUNCH_MS;

  const pageCount = query.data?.pages.length ?? 0;
  const hasMore = Boolean(
    queryEnabled && query.data?.pages[query.data.pages.length - 1]?.nextCursor,
  );
  const wantsMore =
    queryEnabled &&
    hasMore &&
    !query.isFetchingNextPage &&
    pageCount < CARD_TX_INDEX_MAX_PAGES &&
    allItems.length < CARD_TX_INDEX_MAX_ITEMS &&
    oldestFetchedTime > targetFloor;
  const { fetchNextPage } = query;

  useEffect(() => {
    if (wantsMore) {
      fetchNextPage();
    }
  }, [wantsMore, fetchNextPage]);

  const moneyAccountItems = useMemo(
    () => allItems.filter(isMoneyAccountCardTransaction),
    [allItems],
  );

  const { bySettlementHash, declined } = useMemo(
    () => classifyCardTransactionsForIndex(moneyAccountItems),
    [moneyAccountItems],
  );

  return {
    bySettlementHash,
    declined,
    oldestFetchedTime:
      oldestFetchedTime === Number.POSITIVE_INFINITY
        ? Number.NEGATIVE_INFINITY
        : oldestFetchedTime,
    isFetching: queryEnabled && (query.isFetching || query.isFetchingNextPage),
    isSettling:
      queryEnabled &&
      !query.isError &&
      (!query.isFetched || query.isFetchingNextPage || wantsMore),
    isError: queryEnabled && Boolean(query.isError),
  };
}
