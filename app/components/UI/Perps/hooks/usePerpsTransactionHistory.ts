import { useCallback, useEffect, useMemo, useState } from 'react';
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
          startTime: startTime || 0,
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
      const userHistoryTransactions =
        transformUserHistoryToTransactions(userHistory);

      // Combine all transactions (no Arbitrum withdrawals - using user history as single source of truth)
      const allTransactions = [
        ...fillTransactions,
        ...orderTransactions,
        ...fundingTransactions,
        ...userHistoryTransactions,
      ];

      // Sort by timestamp descending (newest first)
      allTransactions.sort((a, b) => b.timestamp - a.timestamp);

      // Remove duplicates based on ID (simplified - no longer needed for withdrawals since we use single source)
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
  }, [startTime, endTime, accountId, userHistory]);

  const refetch = useCallback(async () => {
    await Promise.all([fetchAllTransactions(), refetchUserHistory()]);
  }, [fetchAllTransactions, refetchUserHistory]);

  useEffect(() => {
    if (!skipInitialFetch) {
      fetchAllTransactions();
    }
  }, [fetchAllTransactions, skipInitialFetch]);

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
  // Live fills take precedence for recent trades, deduplicated by ID
  const mergedTransactions = useMemo(() => {
    // Transform live fills to PerpsTransaction format
    const liveTransactions = transformFillsToTransactions(liveFills);

    // If no REST transactions yet, return only live fills
    if (transactions.length === 0) {
      return liveTransactions;
    }

    // Merge: live fills + REST data, keeping only unique transactions by ID
    // Use Map for efficient deduplication (live fills overwrite REST duplicates)
    const txMap = new Map<string, PerpsTransaction>();

    // Add REST transactions first
    for (const tx of transactions) {
      txMap.set(tx.id, tx);
    }

    // Add live fills (overwrites any duplicates from REST)
    for (const tx of liveTransactions) {
      txMap.set(tx.id, tx);
    }

    // Convert back to array and sort by timestamp descending
    return Array.from(txMap.values()).sort((a, b) => b.timestamp - a.timestamp);
  }, [liveFills, transactions]);

  return {
    transactions: mergedTransactions,
    isLoading: combinedIsLoading,
    error: combinedError,
    refetch,
  };
};
