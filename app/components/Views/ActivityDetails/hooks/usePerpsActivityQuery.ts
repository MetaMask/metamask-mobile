import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { BigNumber } from 'bignumber.js';
import {
  TransactionType,
  hasTransactionType,
  type TransactionMeta,
} from '@metamask/transaction-controller';
import type { CaipAccountId } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import { MINUTE } from '../../../../constants/time';
import { selectSelectedAccountGroupEvmInternalAccount } from '../../../../selectors/multichainAccounts/accountTreeController';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { areAddressesEqual } from '../../../../util/address';
import {
  MAX_LOOKBACK_MS,
  PAGE_WINDOW_MS,
} from '../../../UI/Perps/constants/perpsConfig';
import type { PerpsTransaction } from '../../../UI/Perps/types/transactionHistory';
import {
  transformFillsToTransactions,
  transformFundingToTransactions,
  transformOrdersToTransactions,
  transformUserHistoryToTransactions,
  transformWalletPerpsDepositsToTransactions,
  transformWithdrawalRequestsToTransactions,
  walletPerpsWithdrawalsToRequests,
} from '../../../UI/Perps/utils/transactionTransforms';

interface PerpsActivityPage {
  transactions: PerpsTransaction[];
  nextCursor?: number;
}

const providerUnavailableMessage = 'Perps provider unavailable';
const providerReadyRetryLimit = 20;
const providerReadyRetryDelayMs = 250;

function dedupeById(transactions: PerpsTransaction[]) {
  const seen = new Set<string>();
  return transactions.filter((transaction) => {
    if (seen.has(transaction.id)) {
      return false;
    }
    seen.add(transaction.id);
    return true;
  });
}

async function fetchPerpsActivityPage({
  accountId,
  cursor,
}: {
  accountId?: CaipAccountId;
  cursor?: number;
}) {
  const controller = Engine.context.PerpsController;
  const provider = controller?.getActiveProviderOrNull();
  if (!controller || !provider) {
    throw new Error(providerUnavailableMessage);
  }

  const now = Date.now();
  const maxStartTime = now - MAX_LOOKBACK_MS;

  if (cursor !== undefined) {
    if (cursor <= maxStartTime) {
      return { transactions: [] };
    }

    const startTime = Math.max(cursor - PAGE_WINDOW_MS, maxStartTime);
    const olderFunding = await provider.getFunding({
      accountId,
      startTime,
      endTime: cursor,
    });
    const nextCursor = cursor - PAGE_WINDOW_MS;

    return {
      transactions: transformFundingToTransactions(olderFunding),
      nextCursor: nextCursor > maxStartTime ? nextCursor : undefined,
    };
  }

  const [fills, orders, funding, userHistory] = await Promise.all([
    controller.getOrderFills(
      { accountId, aggregateByTime: false },
      { forceRefresh: true },
    ),
    controller.getOrders({ accountId }, { forceRefresh: true }),
    controller.getFunding({ accountId }, { forceRefresh: true }),
    provider.getUserHistory({ accountId }),
  ]);

  const orderMap = new Map(orders.map((order) => [order.orderId, order]));
  const fillSizeByOrderId = new Map<string, BigNumber>();
  for (const fill of fills) {
    if (!fill.orderId) {
      continue;
    }
    const current = fillSizeByOrderId.get(fill.orderId) ?? new BigNumber(0);
    fillSizeByOrderId.set(fill.orderId, current.plus(fill.size || '0'));
  }

  const transactions = dedupeById([
    ...transformFillsToTransactions(
      fills.map((fill) => ({
        ...fill,
        detailedOrderType: orderMap.get(fill.orderId)?.detailedOrderType,
      })),
    ),
    ...transformOrdersToTransactions(orders, fillSizeByOrderId),
    ...transformFundingToTransactions(funding),
    ...transformUserHistoryToTransactions(userHistory),
  ]);

  const nextCursor = now - PAGE_WINDOW_MS;
  return {
    transactions,
    nextCursor: nextCursor > maxStartTime ? nextCursor : undefined,
  };
}

function flattenPages(data?: InfiniteData<PerpsActivityPage>) {
  if (!data) {
    return [];
  }

  const seen = new Set<string>();
  const transactions: PerpsTransaction[] = [];
  for (const page of data.pages) {
    for (const transaction of page.transactions) {
      if (seen.has(transaction.id)) {
        continue;
      }
      seen.add(transaction.id);
      transactions.push(transaction);
    }
  }

  return transactions.sort((left, right) => right.timestamp - left.timestamp);
}

export function usePerpsActivityQuery(
  accountId: CaipAccountId | undefined,
  enabled: boolean,
) {
  const query = useInfiniteQuery({
    queryKey: ['perpsActivity', accountId ?? null],
    queryFn: ({ pageParam }: { pageParam: number | undefined }) =>
      fetchPerpsActivityPage({ accountId, cursor: pageParam }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: PerpsActivityPage) => lastPage.nextCursor,
    enabled,
    refetchOnMount: 'always',
    retry: (failureCount, error) =>
      error instanceof Error &&
      error.message === providerUnavailableMessage &&
      failureCount < providerReadyRetryLimit,
    retryDelay: providerReadyRetryDelayMs,
    staleTime: 5 * MINUTE,
  });

  const walletTransactions = useSelector(selectNonReplacedTransactions);
  const selectedAddress = useSelector(
    selectSelectedAccountGroupEvmInternalAccount,
  )?.address;

  const { walletDeposits, walletWithdrawals } = useMemo(() => {
    if (!selectedAddress) {
      return {
        walletDeposits: [] as PerpsTransaction[],
        walletWithdrawals: [] as PerpsTransaction[],
      };
    }

    const deposits: TransactionMeta[] = [];
    const withdrawals: TransactionMeta[] = [];
    for (const transaction of walletTransactions) {
      if (
        !areAddressesEqual(transaction.txParams?.from ?? '', selectedAddress)
      ) {
        continue;
      }
      if (
        hasTransactionType(transaction, [
          TransactionType.perpsDeposit,
          TransactionType.perpsDepositAndOrder,
        ])
      ) {
        deposits.push(transaction);
      } else if (
        hasTransactionType(transaction, [TransactionType.perpsWithdraw])
      ) {
        withdrawals.push(transaction);
      }
    }

    return {
      walletDeposits: transformWalletPerpsDepositsToTransactions(deposits),
      walletWithdrawals: transformWithdrawalRequestsToTransactions(
        walletPerpsWithdrawalsToRequests(withdrawals),
      ),
    };
  }, [selectedAddress, walletTransactions]);

  const transactions = useMemo(() => {
    const rest = flattenPages(query.data);
    const restHashes = new Set(
      rest
        .map((tx) => tx.depositWithdrawal?.txHash?.toLowerCase?.()?.trim())
        .filter((hash): hash is string => Boolean(hash)),
    );
    const extra = [...walletDeposits, ...walletWithdrawals].filter((tx) => {
      const hash = tx.depositWithdrawal?.txHash?.toLowerCase?.()?.trim() ?? '';
      return hash === '' || !restHashes.has(hash);
    });
    return [...rest, ...extra].sort(
      (left, right) => right.timestamp - left.timestamp,
    );
  }, [query.data, walletDeposits, walletWithdrawals]);

  return {
    ...query,
    transactions,
  };
}
