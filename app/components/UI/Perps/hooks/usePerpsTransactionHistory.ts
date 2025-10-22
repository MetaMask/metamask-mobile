import { useCallback, useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import type { CaipAccountId } from '@metamask/utils';
import { PerpsTransaction } from '../types/transactionHistory';
import { useUserHistory } from './useUserHistory';
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

      // Transform each data type to PerpsTransaction format
      const fillTransactions = transformFillsToTransactions(fills);
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

  return {
    transactions,
    isLoading: combinedIsLoading,
    error: combinedError,
    refetch,
  };
};
