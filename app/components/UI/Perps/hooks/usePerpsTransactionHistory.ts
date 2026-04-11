import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import usePrevious from '../../../hooks/usePrevious';
import { BigNumber } from 'bignumber.js';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import {
  PERPS_TRANSACTIONS_HISTORY_CONSTANTS,
  type OrderFill,
} from '@metamask/perps-controller';

const PAGE_WINDOW_MS =
  PERPS_TRANSACTIONS_HISTORY_CONSTANTS.FUNDING_HISTORY_PAGE_WINDOW_DAYS *
  24 *
  60 *
  60 *
  1000;
const MAX_LOOKBACK_MS =
  PERPS_TRANSACTIONS_HISTORY_CONSTANTS.DEFAULT_FUNDING_HISTORY_DAYS *
  24 *
  60 *
  60 *
  1000;
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { CaipAccountId } from '@metamask/utils';
import { areAddressesEqual } from '../../../../util/address';
import { selectNonReplacedTransactions } from '../../../../selectors/transactionController';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../selectors/accountsController';
import {
  PerpsTransaction,
  PerpsTransactionType,
} from '../types/transactionHistory';
import { hasTransactionType } from '../../../Views/confirmations/utils/transaction';
import { useUserHistory } from './useUserHistory';
import { usePerpsLiveFills } from './stream/usePerpsLiveFills';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
  transformWalletPerpsDepositsToTransactions,
  transformWithdrawalRequestsToTransactions,
  walletPerpsWithdrawalsToRequests,
  mergeOrderFills,
} from '../utils/transactionTransforms';

function deduplicateByTxHash(
  walletTxs: PerpsTransaction[],
  restHashes: Set<string>,
) {
  return walletTxs.filter((tx) => {
    const walletTxHash =
      tx.depositWithdrawal?.txHash?.toLowerCase?.()?.trim() ?? '';
    return walletTxHash === '' || !restHashes.has(walletTxHash);
  });
}

interface UsePerpsTransactionHistoryParams {
  accountId?: CaipAccountId;
  skipInitialFetch?: boolean;
}

interface UsePerpsTransactionHistoryResult {
  transactions: PerpsTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  loadMoreFunding: () => Promise<void>;
  hasFundingMore: boolean;
  isFetchingMoreFunding: boolean;
}

/**
 * Comprehensive hook to fetch and combine all perps transaction data
 * Includes trades, orders, funding, and user history (deposits/withdrawals)
 * Uses HyperLiquid user history as the single source of truth for withdrawals
 */
export const usePerpsTransactionHistory = ({
  accountId,
  skipInitialFetch = false,
}: UsePerpsTransactionHistoryParams = {}): UsePerpsTransactionHistoryResult => {
  const [transactions, setTransactions] = useState<PerpsTransaction[]>([]);
  const [restFills, setRestFills] = useState<OrderFill[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cursor tracks the startTime of the oldest funding window already fetched.
  // null = initial fetch not done yet.
  const fundingCursorRef = useRef<number | null>(null);
  const [hasFundingMore, setHasFundingMore] = useState(true);
  const [isFetchingMoreFunding, setIsFetchingMoreFunding] = useState(false);

  // Get user history (includes deposits/withdrawals) - single source of truth
  const {
    userHistory,
    isLoading: userHistoryLoading,
    error: userHistoryError,
    refetch: refetchUserHistory,
  } = useUserHistory({ accountId });

  // Subscribe to live WebSocket fills for instant trade updates
  // This ensures new trades appear immediately without waiting for REST refetch
  const { fills: liveFills } = usePerpsLiveFills({ throttleMs: 0 });

  // Wallet perps deposits and withdrawals for the Deposits tab
  const walletTransactions = useSelector(selectNonReplacedTransactions);
  const selectedAddress = useSelector(
    selectSelectedInternalAccountFormattedAddress,
  );
  const { walletDepositTransactions, walletWithdrawalTransactions } =
    useMemo(() => {
      if (!selectedAddress) {
        return {
          walletDepositTransactions: [] as PerpsTransaction[],
          walletWithdrawalTransactions: [] as PerpsTransaction[],
        };
      }

      const deposits: TransactionMeta[] = [];
      const withdrawals: TransactionMeta[] = [];

      for (const tx of walletTransactions) {
        if (!areAddressesEqual(tx.txParams?.from ?? '', selectedAddress)) {
          continue;
        }
        if (
          hasTransactionType(tx, [
            TransactionType.perpsDeposit,
            TransactionType.perpsDepositAndOrder,
          ])
        ) {
          deposits.push(tx);
        } else if (hasTransactionType(tx, [TransactionType.perpsWithdraw])) {
          withdrawals.push(tx);
        }
      }

      return {
        walletDepositTransactions:
          transformWalletPerpsDepositsToTransactions(deposits),
        walletWithdrawalTransactions: transformWithdrawalRequestsToTransactions(
          walletPerpsWithdrawalsToRequests(withdrawals),
        ),
      };
    }, [walletTransactions, selectedAddress]);

  // Store userHistory in ref to avoid recreating fetchAllTransactions callback
  const userHistoryRef = useRef(userHistory);
  // Track if initial fetch has been done to prevent duplicate fetches
  const initialFetchDone = useRef(false);
  // Track previous skipInitialFetch value to detect connection state transitions
  const prevSkipInitialFetch = usePrevious(skipInitialFetch);
  useEffect(() => {
    userHistoryRef.current = userHistory;
  }, [userHistory]);

  const fetchAllTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const controller = Engine.context.PerpsController;
      if (!controller) {
        throw new Error('PerpsController not available');
      }

      const provider = controller.getActiveProviderOrNull();
      if (!provider) {
        setIsLoading(false);
        return;
      }

      DevLogger.log('Fetching comprehensive transaction history...');

      const fetchEndTime = Date.now();

      // Fetch all transaction data in parallel
      const [fills, orders, funding] = await Promise.all([
        provider.getOrderFills({
          accountId,
          aggregateByTime: false,
        }),
        provider.getOrders({ accountId }),
        provider.getFunding({ accountId }),
      ]);

      DevLogger.log('Transaction data fetched:', { fills, orders, funding });

      const orderMap = new Map(orders.map((order) => [order.orderId, order]));

      // Attaching detailedOrderType allows us to display the TP/SL pill in the trades history list.
      const enrichedFills = fills.map((fill) => ({
        ...fill,
        detailedOrderType: orderMap.get(fill.orderId)?.detailedOrderType,
      }));

      // Build fill size map: orderId -> total filled size
      // This allows accurate filled percentage calculation for historical orders,
      // since HyperLiquid's historical orders API returns sz=0 for all completed orders
      const fillSizeByOrderId = new Map<string, BigNumber>();
      for (const fill of fills) {
        if (fill.orderId) {
          const current = fillSizeByOrderId.get(fill.orderId) || BigNumber(0);
          fillSizeByOrderId.set(fill.orderId, current.plus(fill.size || '0'));
        }
      }

      // Store raw enriched fills so mergedTransactions can merge at fill level
      // (prevents WS partial-snapshot from overwriting correctly aggregated REST data)
      setRestFills(enrichedFills);

      // Transform each data type to PerpsTransaction format
      // Note: fill transactions are derived in mergedTransactions from restFills,
      // so we only need orders, funding, and user history here.
      const orderTransactions = transformOrdersToTransactions(
        orders,
        fillSizeByOrderId,
      );
      const fundingTransactions = transformFundingToTransactions(funding);
      const userHistoryTransactions = transformUserHistoryToTransactions(
        userHistoryRef.current,
      );

      // Combine all non-trade transactions (no Arbitrum withdrawals - using user history as single source of truth)
      const allTransactions = [
        ...orderTransactions,
        ...fundingTransactions,
        ...userHistoryTransactions,
      ];

      // Sort by timestamp descending (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Remove duplicates based on ID
      const uniqueTransactions = allTransactions.reduce((acc, transaction) => {
        const existingIndex = acc.findIndex((t) => t.id === transaction.id);
        if (existingIndex === -1) {
          acc.push(transaction);
        }
        return acc;
      }, [] as PerpsTransaction[]);

      DevLogger.log('Combined transactions:', uniqueTransactions);
      setTransactions(uniqueTransactions);

      // Reset funding pagination cursor to the start of the first (most recent) window
      fundingCursorRef.current = fetchEndTime - PAGE_WINDOW_MS;
      setHasFundingMore(true);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch transaction history';
      DevLogger.log('Error fetching transaction history:', errorMessage);
      setError(errorMessage);
      setTransactions([]);
      setRestFills([]);
    } finally {
      setIsLoading(false);
    }
  }, [accountId]);

  const refetch = useCallback(async () => {
    // Fetch user history first, then fetch all transactions
    const freshUserHistory = await refetchUserHistory();
    userHistoryRef.current = freshUserHistory;
    await fetchAllTransactions();
  }, [fetchAllTransactions, refetchUserHistory]);

  const loadMoreFunding = useCallback(async () => {
    if (!hasFundingMore || isFetchingMoreFunding) return;

    const controller = Engine.context.PerpsController;
    if (!controller) return;

    const provider = controller.getActiveProviderOrNull();
    if (!provider) return;

    const cursorEndTime = fundingCursorRef.current;
    if (cursorEndTime === null) return;

    const cursorStartTime = cursorEndTime - PAGE_WINDOW_MS;
    const maxStartTime = Date.now() - MAX_LOOKBACK_MS;

    if (cursorStartTime <= maxStartTime) {
      setHasFundingMore(false);
      return;
    }

    DevLogger.log('[PERPS-FUNDING] loadMoreFunding: fetching older window', {
      cursorStartTime,
      cursorEndTime,
      windowDays: Math.round(PAGE_WINDOW_MS / (24 * 60 * 60 * 1000)),
    });

    setIsFetchingMoreFunding(true);
    try {
      const olderFunding = await provider.getFunding({
        accountId,
        startTime: Math.max(cursorStartTime, maxStartTime),
        endTime: cursorEndTime,
      });

      DevLogger.log('[PERPS-FUNDING] loadMoreFunding: older records loaded', {
        count: olderFunding.length,
        newCursor: cursorStartTime,
        hasMore: olderFunding.length > 0,
      });

      if (olderFunding.length === 0) {
        setHasFundingMore(false);
        return;
      }

      fundingCursorRef.current = cursorStartTime;

      const olderFundingTxs = transformFundingToTransactions(olderFunding);
      setTransactions((prev) => {
        const combined = [...prev, ...olderFundingTxs];
        return combined.sort((a, b) => b.timestamp - a.timestamp);
      });

      if (Math.max(cursorStartTime, maxStartTime) <= maxStartTime) {
        setHasFundingMore(false);
      }
    } finally {
      setIsFetchingMoreFunding(false);
    }
  }, [accountId, hasFundingMore, isFetchingMoreFunding]);

  useEffect(() => {
    // Detect transition from skipping (not connected) to not skipping (connected)
    // This fixes the case where the component mounts before connection is established
    const justBecameConnected = prevSkipInitialFetch && !skipInitialFetch;

    // Trigger fetch if:
    // 1. Not skipping AND haven't fetched yet (normal initial fetch)
    // 2. Connection just became available (transition from disconnected to connected)
    if (
      !skipInitialFetch &&
      (!initialFetchDone.current || justBecameConnected)
    ) {
      initialFetchDone.current = true;
      refetch();
    }
  }, [skipInitialFetch, prevSkipInitialFetch, refetch]);

  // Combine loading states
  const combinedIsLoading = useMemo(
    () => isLoading || userHistoryLoading,
    [isLoading, userHistoryLoading],
  );

  // Combine error states
  const combinedError = useMemo(() => {
    if (error) return error;
    if (userHistoryError) return userHistoryError;
    return null;
  }, [error, userHistoryError]);

  // Merge live WebSocket fills with REST fills at the raw OrderFill level first,
  // then transform once. This ensures multi-fill trades (e.g. SL split into 10
  // sub-fills) are aggregated from the complete fill set rather than from the WS
  // partial snapshot, which would produce an incorrect (lower) PnL and size.
  const mergedTransactions = useMemo(() => {
    // Transform once on the complete merged fill set
    const mergedFillTransactions = transformFillsToTransactions(
      mergeOrderFills(restFills, liveFills),
    );

    // Separate non-trade transactions (orders, funding, user history deposits)
    const nonTradeTransactions = transactions.filter(
      (tx) => tx.type !== PerpsTransactionType.Trade,
    );

    // Deduplicate wallet deposits/withdrawals against REST (user history) by txHash.
    // When a wallet-originated transaction is bridged and recorded by the perps backend,
    // it appears in both sources; we keep the REST version and drop the wallet duplicate.
    const restDepositTxHashes = new Set<string>();
    const restWithdrawalTxHashes = new Set<string>();
    for (const tx of nonTradeTransactions) {
      const restTxHash = tx.depositWithdrawal?.txHash?.trim();
      if (!restTxHash) continue;
      const normalizedHash = restTxHash.toLowerCase();
      if (tx.type === PerpsTransactionType.Deposit) {
        restDepositTxHashes.add(normalizedHash);
      } else if (tx.type === PerpsTransactionType.Withdrawal) {
        restWithdrawalTxHashes.add(normalizedHash);
      }
    }

    const walletDepositsDeduplicated = deduplicateByTxHash(
      walletDepositTransactions,
      restDepositTxHashes,
    );
    const walletWithdrawalsDeduplicated = deduplicateByTxHash(
      walletWithdrawalTransactions,
      restWithdrawalTxHashes,
    );

    const allTransactions = [
      ...mergedFillTransactions,
      ...nonTradeTransactions,
      ...walletDepositsDeduplicated,
      ...walletWithdrawalsDeduplicated,
    ];

    return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
  }, [
    liveFills,
    restFills,
    transactions,
    walletDepositTransactions,
    walletWithdrawalTransactions,
  ]);

  return {
    transactions: mergedTransactions,
    isLoading: combinedIsLoading,
    error: combinedError,
    refetch,
    loadMoreFunding,
    hasFundingMore,
    isFetchingMoreFunding,
  };
};
