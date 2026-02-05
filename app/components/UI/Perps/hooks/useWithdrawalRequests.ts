import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { UserHistoryItem } from '../controllers/types';

export interface WithdrawalRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  accountAddress: string; // Account that initiated this withdrawal
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  destination?: string;
  withdrawalId?: string;
}

export interface UseWithdrawalRequestsOptions {
  /**
   * Skip initial fetch (useful for conditional loading)
   */
  skipInitialFetch?: boolean;
}

interface UseWithdrawalRequestsResult {
  withdrawalRequests: WithdrawalRequest[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to track withdrawal requests and detect completion using FIFO queue matching.
 *
 * This hook:
 * 1. Returns pending withdrawals from PerpsController state for display (the queue)
 * 2. Polls getUserHistory (same API as "Deposits" tab in activity view) to detect completion
 * 3. Uses FIFO matching: oldest pending withdrawal matches with first completed withdrawal
 * in history that happened after its submission time
 *
 * Key design: We use getUserHistory (same data source as the activity view "Deposits" tab).
 * This ensures we only clear the pending indicator when the user can see the completed
 * transaction in their activity view.
 *
 * Multi-withdrawal support: If user submits withdrawal B while A is still pending,
 * both are tracked in the queue. A (oldest) is matched first, then B.
 */
export const useWithdrawalRequests = (
  options: UseWithdrawalRequestsOptions = {},
): UseWithdrawalRequestsResult => {
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

  // Get pending/bridging withdrawals sorted by timestamp (oldest first = FIFO queue)
  // Memoized to prevent new array reference on every render
  const pendingQueue = useMemo(
    () =>
      allWithdrawals
        .filter((req) => req.status === 'pending' || req.status === 'bridging')
        .sort((a, b) => a.timestamp - b.timestamp),
    [allWithdrawals],
  );

  // Extract oldest pending timestamp for dependency tracking (avoids array reference issues)
  const oldestPendingTimestamp = pendingQueue[0]?.timestamp ?? null;

  // Get last completed withdrawal timestamp to prevent same completion matching multiple pending withdrawals
  // This is critical: if we completed withdrawal A at t=250, the next completion must be AFTER t=250
  const lastCompletedTimestamp = usePerpsSelector(
    (state) => state?.lastWithdrawResult?.timestamp ?? null,
  );

  // Track previous withdrawal states to detect meaningful changes (for logging)
  const prevWithdrawalStatesRef = useRef<Map<string, string>>(new Map());

  // Track if initial fetch has been done to avoid re-running on callback changes
  const initialFetchDoneRef = useRef(false);

  // Log only meaningful withdrawal state changes (not on every render)
  useEffect(() => {
    const currentStates = new Map<string, string>();
    allWithdrawals.forEach((w) => currentStates.set(w.id, w.status));

    const prevStates = prevWithdrawalStatesRef.current;

    // Check for new withdrawals (initialized)
    for (const withdrawal of allWithdrawals) {
      if (!prevStates.has(withdrawal.id)) {
        DevLogger.log('Withdrawal initialized:', {
          id: withdrawal.id,
          amount: withdrawal.amount,
          asset: withdrawal.asset,
          status: withdrawal.status,
          timestamp: new Date(withdrawal.timestamp).toISOString(),
        });
      }
    }

    // Check for status changes (progress) and completions
    for (const withdrawal of allWithdrawals) {
      const prevStatus = prevStates.get(withdrawal.id);
      if (prevStatus && prevStatus !== withdrawal.status) {
        if (withdrawal.status === 'completed') {
          DevLogger.log('Withdrawal completed:', {
            id: withdrawal.id,
            amount: withdrawal.amount,
            asset: withdrawal.asset,
            txHash: withdrawal.txHash,
          });
        } else {
          DevLogger.log('Withdrawal status changed:', {
            id: withdrawal.id,
            previousStatus: prevStatus,
            newStatus: withdrawal.status,
            amount: withdrawal.amount,
          });
        }
      }
    }

    // Update ref with current states
    prevWithdrawalStatesRef.current = currentStates;
  }, [allWithdrawals]);

  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  /**
   * Check for withdrawal completion using FIFO matching.
   * Polls getUserHistory (same API as "Deposits" tab) and matches
   * the oldest pending withdrawal with the first completed withdrawal
   * in history that happened after its submission time.
   */
  const checkForWithdrawalCompletion = useCallback(async () => {
    // Only check if there are pending withdrawals in the queue
    if (pendingQueue.length === 0) {
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

      // Check if provider has getUserHistory method
      if (!('getUserHistory' in provider)) {
        throw new Error('Provider does not support user history');
      }

      // FIFO: Get the oldest pending withdrawal (first in queue)
      const oldestPending = pendingQueue[0];

      // Only fetch history starting from before the oldest pending withdrawal
      // This optimizes the query to only the relevant time window
      const searchStartTime = oldestPending.timestamp - 60000; // 1 minute buffer

      DevLogger.log(
        'useWithdrawalRequests: Checking for withdrawal completion (FIFO)',
        {
          queueLength: pendingQueue.length,
          oldestPendingId: oldestPending.id,
          oldestPendingSubmittedAt: new Date(
            oldestPending.timestamp,
          ).toISOString(),
          searchStartTime: new Date(searchStartTime).toISOString(),
        },
      );

      // Fetch user history - same API as activity view "Deposits" tab
      const history: UserHistoryItem[] = await provider.getUserHistory({
        startTime: searchStartTime,
        endTime: undefined,
      });

      const safeHistory = Array.isArray(history) ? history : [];

      // Find completed withdrawals in history, sorted by timestamp (oldest first)
      const completedWithdrawals = safeHistory
        .filter(
          (item) => item.type === 'withdrawal' && item.status === 'completed',
        )
        .sort((a, b) => a.timestamp - b.timestamp);

      if (completedWithdrawals.length === 0) {
        DevLogger.log(
          'useWithdrawalRequests: No completed withdrawals in history yet',
        );
        return;
      }

      // FIFO matching: find the first completed withdrawal that:
      // 1. Happened AFTER the oldest pending withdrawal was submitted
      // 2. Happened AFTER the last completed withdrawal we processed (to avoid double-matching)
      //
      // The second condition is critical: if user withdraws A at t=100, B at t=200,
      // and we find a completion at t=250, it should only match A.
      // On the next poll, the same t=250 completion should NOT match B.
      // Only a NEW completion (e.g., t=350) should match B.
      const matchingCompleted = completedWithdrawals.find(
        (completed) =>
          completed.timestamp > oldestPending.timestamp &&
          (lastCompletedTimestamp === null ||
            completed.timestamp > lastCompletedTimestamp),
      );

      if (!matchingCompleted) {
        DevLogger.log(
          'useWithdrawalRequests: No NEW completed withdrawals after oldest pending submission',
          {
            oldestPendingTimestamp: new Date(
              oldestPending.timestamp,
            ).toISOString(),
            lastCompletedTimestamp: lastCompletedTimestamp
              ? new Date(lastCompletedTimestamp).toISOString()
              : 'none',
            latestInHistory:
              completedWithdrawals.length > 0
                ? new Date(
                    completedWithdrawals[
                      completedWithdrawals.length - 1
                    ].timestamp,
                  ).toISOString()
                : 'none',
          },
        );
        return;
      }

      DevLogger.log(
        'useWithdrawalRequests: FIFO match found! NEW withdrawal completed and visible in history',
        {
          pendingId: oldestPending.id,
          pendingSubmittedAt: new Date(oldestPending.timestamp).toISOString(),
          completedTxHash: matchingCompleted.txHash,
          completedTimestamp: new Date(
            matchingCompleted.timestamp,
          ).toISOString(),
          lastCompletedTimestamp: lastCompletedTimestamp
            ? new Date(lastCompletedTimestamp).toISOString()
            : 'none',
          remainingInQueue: pendingQueue.length - 1,
        },
      );

      // Call completeWithdrawalFromHistory to remove this specific withdrawal from queue
      controller.completeWithdrawalFromHistory(oldestPending.id, {
        txHash: matchingCompleted.txHash,
        amount: matchingCompleted.amount,
        timestamp: matchingCompleted.timestamp,
        asset: matchingCompleted.asset,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch completed withdrawals';
      console.error('Error checking withdrawal completion:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [pendingQueue, lastCompletedTimestamp]);

  // Initial check when component mounts (if not skipping and queue has items)
  // Uses ref to ensure this only runs once, not on every callback recreation
  useEffect(() => {
    if (
      !skipInitialFetch &&
      pendingQueue.length > 0 &&
      !initialFetchDoneRef.current
    ) {
      initialFetchDoneRef.current = true;
      checkForWithdrawalCompletion();
    }
  }, [checkForWithdrawalCompletion, skipInitialFetch, pendingQueue.length]);

  // Poll for completion when there are pending withdrawals in the queue
  useEffect(() => {
    if (pendingQueue.length === 0 || !oldestPendingTimestamp) {
      return; // No need to poll if queue is empty
    }

    DevLogger.log(
      'useWithdrawalRequests: Starting polling for withdrawal completion (FIFO)',
      {
        queueLength: pendingQueue.length,
        oldestSubmittedAt: new Date(oldestPendingTimestamp).toISOString(),
      },
    );

    // Poll every 5 seconds when there are pending withdrawals
    const pollInterval = setInterval(() => {
      checkForWithdrawalCompletion();
    }, 5000);

    return () => {
      DevLogger.log('useWithdrawalRequests: Stopping polling');
      clearInterval(pollInterval);
    };
  }, [
    pendingQueue.length,
    oldestPendingTimestamp,
    checkForWithdrawalCompletion,
  ]);

  // Return pending withdrawals sorted by timestamp (newest first for display)
  // Memoized to prevent new array reference on every render
  const sortedForDisplay = useMemo(
    () => [...pendingQueue].sort((a, b) => b.timestamp - a.timestamp),
    [pendingQueue],
  );

  return {
    withdrawalRequests: sortedForDisplay,
    isLoading,
    error,
    refetch: checkForWithdrawalCompletion,
  };
};
