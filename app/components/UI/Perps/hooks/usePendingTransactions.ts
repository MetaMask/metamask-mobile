import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { UserHistoryItem } from '../controllers/types';

export interface PendingTransaction {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  accountAddress: string;
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  type: 'deposit' | 'withdrawal';
  // Withdrawal-specific fields
  destination?: string;
  withdrawalId?: string;
  // Deposit-specific fields
  source?: string;
  depositId?: string;
}

export interface UsePendingTransactionsOptions {
  /**
   * Skip initial fetch (useful for conditional loading)
   */
  skipInitialFetch?: boolean;
}

interface UsePendingTransactionsResult {
  /** All pending deposits in the queue (for display, newest first) */
  pendingDeposits: PendingTransaction[];
  /** All pending withdrawals in the queue (for display, newest first) */
  pendingWithdrawals: PendingTransaction[];
  /** Combined pending transactions (for progress bar) */
  allPending: PendingTransaction[];
  /** Whether there are any pending transactions */
  hasPendingTransactions: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Combined hook to track both pending deposits and withdrawals using FIFO queue matching.
 *
 * This hook:
 * 1. Returns pending deposits and withdrawals from PerpsController state (the queues)
 * 2. Polls getUserHistory (same API as "Deposits" tab in activity view) to detect completions
 * 3. Uses FIFO matching: oldest pending transaction matches with first completed transaction
 * in history that happened after its submission time
 *
 * Key design: We use getUserHistory (same data source as the activity view "Deposits" tab).
 * This ensures we only clear the pending indicator when the user can see the completed
 * transaction in their activity view.
 *
 * Multi-transaction support: If user submits multiple deposits/withdrawals while others
 * are still pending, each is tracked in its own queue. Oldest is matched first (FIFO).
 */
export const usePendingTransactions = (
  options: UsePendingTransactionsOptions = {},
): UsePendingTransactionsResult => {
  const { skipInitialFetch = false } = options;

  // Get current selected account address
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  // Get all withdrawals from controller state, filtered by current account
  const allWithdrawals = useStableArray(
    usePerpsSelector((state) => {
      const withdrawals = state?.withdrawalRequests || [];
      if (!selectedAddress) return [];
      return withdrawals.filter(
        (req) =>
          req.accountAddress?.toLowerCase() === selectedAddress.toLowerCase(),
      );
    }),
  );

  // Get all deposits from controller state, filtered by current account
  const allDeposits = useStableArray(
    usePerpsSelector((state) => {
      const deposits = state?.depositRequests || [];
      if (!selectedAddress) return [];
      return deposits.filter(
        (req) =>
          req.accountAddress?.toLowerCase() === selectedAddress.toLowerCase(),
      );
    }),
  );

  // Get pending/bridging withdrawals sorted by timestamp (oldest first = FIFO queue)
  const pendingWithdrawalQueue = useMemo(
    () =>
      allWithdrawals
        .filter((req) => req.status === 'pending' || req.status === 'bridging')
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((req) => ({ ...req, type: 'withdrawal' as const })),
    [allWithdrawals],
  );

  // Get pending/bridging deposits sorted by timestamp (oldest first = FIFO queue)
  const pendingDepositQueue = useMemo(
    () =>
      allDeposits
        .filter((req) => req.status === 'pending' || req.status === 'bridging')
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((req) => ({ ...req, type: 'deposit' as const })),
    [allDeposits],
  );

  // Extract oldest pending timestamps for dependency tracking
  const oldestPendingWithdrawalTimestamp =
    pendingWithdrawalQueue[0]?.timestamp ?? null;
  const oldestPendingDepositTimestamp =
    pendingDepositQueue[0]?.timestamp ?? null;

  // Get last completed timestamps to prevent same completion matching multiple pending transactions
  const lastCompletedWithdrawalTimestamp = usePerpsSelector(
    (state) => state?.lastWithdrawResult?.timestamp ?? null,
  );
  const lastCompletedDepositTimestamp = usePerpsSelector(
    (state) => state?.lastDepositResult?.timestamp ?? null,
  );

  // Track if initial fetch has been done to avoid re-running on callback changes
  const initialFetchDoneRef = useRef(false);

  // Track previous transaction states for logging
  const prevStatesRef = useRef<Map<string, string>>(new Map());

  // Log meaningful state changes
  useEffect(() => {
    const allTransactions = [...allWithdrawals, ...allDeposits];
    const currentStates = new Map<string, string>();
    allTransactions.forEach((t) => currentStates.set(t.id, t.status));

    const prevStates = prevStatesRef.current;

    for (const transaction of allTransactions) {
      if (!prevStates.has(transaction.id)) {
        DevLogger.log('Transaction initialized:', {
          id: transaction.id,
          type: 'withdrawalId' in transaction ? 'withdrawal' : 'deposit',
          amount: transaction.amount,
          status: transaction.status,
          timestamp: new Date(transaction.timestamp).toISOString(),
        });
      } else {
        const prevStatus = prevStates.get(transaction.id);
        if (prevStatus !== transaction.status) {
          DevLogger.log('Transaction status changed:', {
            id: transaction.id,
            previousStatus: prevStatus,
            newStatus: transaction.status,
          });
        }
      }
    }

    prevStatesRef.current = currentStates;
  }, [allWithdrawals, allDeposits]);

  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check for transaction completions using FIFO matching.
   * Polls getUserHistory and matches the oldest pending transaction (of each type)
   * with the first completed transaction in history that happened after its submission time.
   */
  const checkForCompletions = useCallback(async () => {
    const hasPendingWithdrawals = pendingWithdrawalQueue.length > 0;
    const hasPendingDeposits = pendingDepositQueue.length > 0;

    // Only check if there are pending transactions in either queue
    if (!hasPendingWithdrawals && !hasPendingDeposits) {
      return;
    }

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

      if (!('getUserHistory' in provider)) {
        throw new Error('Provider does not support user history');
      }

      // Calculate search start time from the oldest pending transaction across both queues
      const oldestWithdrawal = pendingWithdrawalQueue[0];
      const oldestDeposit = pendingDepositQueue[0];
      const oldestTimestamp = Math.min(
        oldestWithdrawal?.timestamp ?? Infinity,
        oldestDeposit?.timestamp ?? Infinity,
      );
      const searchStartTime = oldestTimestamp - 60000; // 1 minute buffer

      DevLogger.log('usePendingTransactions: Checking for completions (FIFO)', {
        pendingWithdrawals: pendingWithdrawalQueue.length,
        pendingDeposits: pendingDepositQueue.length,
        searchStartTime: new Date(searchStartTime).toISOString(),
      });

      // Fetch user history - includes both deposits and withdrawals
      const history: UserHistoryItem[] = await provider.getUserHistory({
        startTime: searchStartTime,
        endTime: undefined,
      });

      const safeHistory = Array.isArray(history) ? history : [];

      // Process withdrawals if any pending
      if (hasPendingWithdrawals && oldestWithdrawal) {
        const completedWithdrawals = safeHistory
          .filter(
            (item) => item.type === 'withdrawal' && item.status === 'completed',
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        const matchingWithdrawal = completedWithdrawals.find(
          (completed) =>
            completed.timestamp > oldestWithdrawal.timestamp &&
            (lastCompletedWithdrawalTimestamp === null ||
              completed.timestamp > lastCompletedWithdrawalTimestamp),
        );

        if (matchingWithdrawal) {
          DevLogger.log(
            'usePendingTransactions: FIFO match found for withdrawal',
            {
              pendingId: oldestWithdrawal.id,
              completedTxHash: matchingWithdrawal.txHash,
              completedTimestamp: new Date(
                matchingWithdrawal.timestamp,
              ).toISOString(),
            },
          );

          controller.completeWithdrawalFromHistory(oldestWithdrawal.id, {
            txHash: matchingWithdrawal.txHash,
            amount: matchingWithdrawal.amount,
            timestamp: matchingWithdrawal.timestamp,
            asset: matchingWithdrawal.asset,
          });
        }
      }

      // Process deposits if any pending
      if (hasPendingDeposits && oldestDeposit) {
        const completedDeposits = safeHistory
          .filter(
            (item) => item.type === 'deposit' && item.status === 'completed',
          )
          .sort((a, b) => a.timestamp - b.timestamp);

        const matchingDeposit = completedDeposits.find(
          (completed) =>
            completed.timestamp > oldestDeposit.timestamp &&
            (lastCompletedDepositTimestamp === null ||
              completed.timestamp > lastCompletedDepositTimestamp),
        );

        if (matchingDeposit) {
          DevLogger.log(
            'usePendingTransactions: FIFO match found for deposit',
            {
              pendingId: oldestDeposit.id,
              completedTxHash: matchingDeposit.txHash,
              completedTimestamp: new Date(
                matchingDeposit.timestamp,
              ).toISOString(),
            },
          );

          controller.completeDepositFromHistory(oldestDeposit.id, {
            txHash: matchingDeposit.txHash,
            amount: matchingDeposit.amount,
            timestamp: matchingDeposit.timestamp,
            asset: matchingDeposit.asset,
          });
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to check transaction completions';
      console.error('Error checking transaction completions:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [
    pendingWithdrawalQueue,
    pendingDepositQueue,
    lastCompletedWithdrawalTimestamp,
    lastCompletedDepositTimestamp,
  ]);

  // Initial check when component mounts
  useEffect(() => {
    const hasPending =
      pendingWithdrawalQueue.length > 0 || pendingDepositQueue.length > 0;
    if (!skipInitialFetch && hasPending && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      checkForCompletions();
    }
  }, [
    checkForCompletions,
    skipInitialFetch,
    pendingWithdrawalQueue.length,
    pendingDepositQueue.length,
  ]);

  // Poll for completions when there are pending transactions
  useEffect(() => {
    const hasPending =
      pendingWithdrawalQueue.length > 0 || pendingDepositQueue.length > 0;

    if (!hasPending) {
      return; // No need to poll if queues are empty
    }

    DevLogger.log('usePendingTransactions: Starting polling', {
      pendingWithdrawals: pendingWithdrawalQueue.length,
      pendingDeposits: pendingDepositQueue.length,
    });

    // Poll every 5 seconds when there are pending transactions
    const pollInterval = setInterval(() => {
      checkForCompletions();
    }, 5000);

    return () => {
      DevLogger.log('usePendingTransactions: Stopping polling');
      clearInterval(pollInterval);
    };
  }, [
    pendingWithdrawalQueue.length,
    pendingDepositQueue.length,
    oldestPendingWithdrawalTimestamp,
    oldestPendingDepositTimestamp,
    checkForCompletions,
  ]);

  // Return pending transactions sorted by timestamp (newest first for display)
  const pendingWithdrawalsForDisplay = useMemo(
    () => [...pendingWithdrawalQueue].sort((a, b) => b.timestamp - a.timestamp),
    [pendingWithdrawalQueue],
  );

  const pendingDepositsForDisplay = useMemo(
    () => [...pendingDepositQueue].sort((a, b) => b.timestamp - a.timestamp),
    [pendingDepositQueue],
  );

  const allPending = useMemo(
    () =>
      [...pendingWithdrawalsForDisplay, ...pendingDepositsForDisplay].sort(
        (a, b) => b.timestamp - a.timestamp,
      ),
    [pendingWithdrawalsForDisplay, pendingDepositsForDisplay],
  );

  return {
    pendingDeposits: pendingDepositsForDisplay,
    pendingWithdrawals: pendingWithdrawalsForDisplay,
    allPending,
    hasPendingTransactions:
      pendingWithdrawalQueue.length > 0 || pendingDepositQueue.length > 0,
    isLoading,
    error,
    refetch: checkForCompletions,
  };
};
