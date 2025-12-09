import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { CaipAccountId } from '@metamask/utils';
import { PerpsTransaction } from '../types/transactionHistory';
import { useUserHistory } from './useUserHistory';
import { usePerpsLiveFills } from './stream/usePerpsLiveFills';
import {
  transformFillsToTransactions,
  transformOrdersToTransactions,
  transformFundingToTransactions,
  transformUserHistoryToTransactions,
} from '../utils/transactionTransforms';

interface UsePerpsTransactionHistoryParams {
  startTime?: number;
  endTime?: number;
  accountId?: CaipAccountId;
  skipInitialFetch?: boolean;
}

interface UsePerpsTransactionHistoryResult {
  transactions: PerpsTransaction[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Comprehensive hook to fetch and combine all perps transaction data
 * Includes trades, orders, funding, and user history (deposits/withdrawals)
 * Uses HyperLiquid user history as the single source of truth for withdrawals
 */
export const usePerpsTransactionHistory = ({
  startTime,
  endTime,
  accountId,
  skipInitialFetch = false,
}: UsePerpsTransactionHistoryParams = {}): UsePerpsTransactionHistoryResult => {
  const [transactions, setTransactions] = useState<PerpsTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get user history (includes deposits/withdrawals) - single source of truth
  const {
    userHistory,
    isLoading: userHistoryLoading,
    error: userHistoryError,
    refetch: refetchUserHistory,
  } = useUserHistory({ startTime, endTime, accountId });

  // Subscribe to live WebSocket fills for instant trade updates
  // This ensures new trades appear immediately without waiting for REST refetch
  const { fills: liveFills } = usePerpsLiveFills({ throttleMs: 0 });

  // Store userHistory in ref to avoid recreating fetchAllTransactions callback
  const userHistoryRef = useRef(userHistory);
  // Track if initial fetch has been done to prevent duplicate fetches
  const initialFetchDone = useRef(false);
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

      const provider = controller.getActiveProvider();
      if (!provider) {
        throw new Error('No active provider available');
      }

      DevLogger.log('Fetching comprehensive transaction history...');

      // Fetch all transaction data in parallel
      const [fills, orders, funding] = await Promise.all([
        provider.getOrderFills({
          accountId,
          aggregateByTime: false,
        }),
        provider.getOrders({ accountId }),
        provider.getFunding({
          accountId,
          startTime,
          endTime,
        }),
      ]);

      DevLogger.log('Transaction data fetched:', { fills, orders, funding });

      const orderMap = new Map(orders.map((order) => [order.orderId, order]));

      // Attaching detailedOrderType allows us to display the TP/SL pill in the trades history list.
      const enrichedFills = fills.map((fill) => ({
        ...fill,
        detailedOrderType: orderMap.get(fill.orderId)?.detailedOrderType,
      }));

      // Transform each data type to PerpsTransaction format
      const fillTransactions = transformFillsToTransactions(enrichedFills);
      const orderTransactions = transformOrdersToTransactions(orders);
      const fundingTransactions = transformFundingToTransactions(funding);
      const userHistoryTransactions = transformUserHistoryToTransactions(
        userHistoryRef.current,
      );

      // Combine all transactions (no Arbitrum withdrawals - using user history as single source of truth)
      const allTransactions = [
        ...fillTransactions,
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
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch transaction history';
      DevLogger.log('Error fetching transaction history:', errorMessage);
      setError(errorMessage);
      setTransactions([]);
    } finally {
      setIsLoading(false);
    }
  }, [startTime, endTime, accountId]);

  const refetch = useCallback(async () => {
    // Fetch user history first, then fetch all transactions
    const freshUserHistory = await refetchUserHistory();
    userHistoryRef.current = freshUserHistory;
    await fetchAllTransactions();
  }, [fetchAllTransactions, refetchUserHistory]);

  useEffect(() => {
    if (!skipInitialFetch && !initialFetchDone.current) {
      initialFetchDone.current = true;
      refetch();
    }
  }, [skipInitialFetch, refetch]);

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

  // Merge live WebSocket fills with REST transactions for instant updates
  // Live fills take precedence for recent trades
  // IMPORTANT: Deduplicate trades using asset+timestamp, not tx.id, because
  // the ID includes array index which differs between REST and WebSocket arrays
  const mergedTransactions = useMemo(() => {
    // Transform live fills to PerpsTransaction format
    const liveTransactions = transformFillsToTransactions(liveFills);

    // If no REST transactions yet, return only live fills
    if (transactions.length === 0) {
      return liveTransactions;
    }

    // Separate trade transactions from non-trade transactions (orders, funding, deposits)
    // Non-trade transactions use their ID directly (no index issue)
    const restTradeTransactions = transactions.filter(
      (tx) => tx.type === 'trade',
    );
    const nonTradeTransactions = transactions.filter(
      (tx) => tx.type !== 'trade',
    );

    // Merge trades using asset+timestamp as dedup key (avoids index mismatch in IDs)
    // This ensures the same fill from REST and WebSocket is deduplicated correctly
    const tradeMap = new Map<string, PerpsTransaction>();

    // Add REST trade transactions first
    for (const tx of restTradeTransactions) {
      // Use asset + timestamp as key (unique per fill, index-independent)
      const dedupKey = `${tx.asset}-${tx.timestamp}`;
      tradeMap.set(dedupKey, tx);
    }

    // Add live fills (overwrites REST duplicates - live data is fresher)
    for (const tx of liveTransactions) {
      const dedupKey = `${tx.asset}-${tx.timestamp}`;
      tradeMap.set(dedupKey, tx);
    }

    // Combine deduplicated trades with non-trade transactions
    const allTransactions = [
      ...Array.from(tradeMap.values()),
      ...nonTradeTransactions,
    ];

    // Sort by timestamp descending
    return allTransactions.sort((a, b) => b.timestamp - a.timestamp);
  }, [liveFills, transactions]);

  return {
    transactions: mergedTransactions,
    isLoading: combinedIsLoading,
    error: combinedError,
    refetch,
  };
};
