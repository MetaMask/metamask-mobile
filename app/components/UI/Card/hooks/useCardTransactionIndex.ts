import { useEffect, useMemo } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { MONEY_ACCOUNT_LAUNCH_MS } from '../../../../core/Engine/controllers/card-controller/types';
import type {
  CardTransaction,
  CardTransactionPage,
} from '../../../../core/Engine/controllers/card-controller/provider-types';
import { isMoneyAccountDecline } from '../utils/cardDeclineReason';
import {
  MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  MONEY_ACCOUNT_DELEGATION_TOKEN_KEY,
} from '../util/vedaToken';

const CARD_TX_INDEX_QUERY_KEY = 'cardTransactionIndex';
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

export function isMoneyAccountCardTransaction(tx: CardTransaction): boolean {
  if (tx.fundingSources.length === 0) {
    return isMoneyAccountDecline(tx);
  }
  return tx.fundingSources.some(
    (fs) =>
      fs.currency?.toLowerCase() === MONEY_ACCOUNT_DELEGATION_TOKEN_KEY &&
      fs.chainId === MONEY_ACCOUNT_DELEGATION_CAIP_CHAIN_ID,
  );
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
    } else {
      declined.push(tx);
    }
  }
  return { bySettlementHash, declined };
}

export function useCardTransactionIndex({
  oldestVisibleTime,
  enabled = true,
}: UseCardTransactionIndexOptions = {}): UseCardTransactionIndexResult {
  const cardController = Engine.context?.CardController;
  const queryEnabled = Boolean(enabled && cardController);

  const query = useInfiniteQuery({
    queryKey: [CARD_TX_INDEX_QUERY_KEY],
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
    enabled: queryEnabled,
  });

  const allItems = useMemo(
    () => query.data?.pages.flatMap((page) => page.items) ?? [],
    [query.data],
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
    query.data?.pages[query.data.pages.length - 1]?.nextCursor,
  );
  const wantsMore =
    queryEnabled &&
    hasMore &&
    !query.isFetchingNextPage &&
    pageCount < CARD_TX_INDEX_MAX_PAGES &&
    allItems.length < CARD_TX_INDEX_MAX_ITEMS &&
    oldestFetchedTime > targetFloor;

  useEffect(() => {
    if (wantsMore) {
      query.fetchNextPage();
    }
  }, [wantsMore, query]);

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
    isFetching: query.isFetching || query.isFetchingNextPage,
    isSettling:
      queryEnabled &&
      !query.isError &&
      (!query.isFetched || query.isFetchingNextPage || wantsMore),
    isError: queryEnabled && Boolean(query.isError),
  };
}
