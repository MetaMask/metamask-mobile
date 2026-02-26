import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { UserHistoryItem } from '@metamask/perps-controller';

export interface WithdrawalRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  accountAddress: string;
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  destination?: string;
  withdrawalId?: string;
}

export interface UseWithdrawalRequestsOptions {
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
 * 1. Returns pending withdrawals from PerpsController state for display (the queue)
 * 2. Polls getUserHistory (same API as "Deposits" tab in activity view) to detect completion
 * 3. Uses FIFO matching: oldest pending withdrawal matches with first completed withdrawal
 * in history that happened after its submission time
 */
export const useWithdrawalRequests = (
  options: UseWithdrawalRequestsOptions = {},
): UseWithdrawalRequestsResult => {
  const { skipInitialFetch = false } = options;

  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

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

  const pendingQueue = useMemo(
    () =>
      allWithdrawals
        .filter((req) => req.status === 'pending' || req.status === 'bridging')
        .sort((a, b) => a.timestamp - b.timestamp),
    [allWithdrawals],
  );

  const oldestPendingTimestamp = pendingQueue[0]?.timestamp ?? null;

  const lastCompletedTimestamp = usePerpsSelector(
    (state) => state?.lastCompletedWithdrawalTimestamp ?? null,
  );
  const lastCompletedTxHashes = usePerpsSelector(
    (state) => state?.lastCompletedWithdrawalTxHashes ?? [],
  );

  const prevWithdrawalStatesRef = useRef<Map<string, string>>(new Map());
  const initialFetchDoneRef = useRef(false);

  useEffect(() => {
    const currentStates = new Map<string, string>();
    allWithdrawals.forEach((w) => currentStates.set(w.id, w.status));

    const prevStates = prevWithdrawalStatesRef.current;

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

    prevWithdrawalStatesRef.current = currentStates;
  }, [allWithdrawals]);

  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingQueue.length === 0) {
      setIsLoading(false);
    }
  }, [pendingQueue.length]);

  const checkForWithdrawalCompletion = useCallback(async () => {
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

      if (!('getUserHistory' in provider)) {
        throw new Error('Provider does not support user history');
      }

      const oldestPending = pendingQueue[0];
      const searchStartTime = oldestPending.timestamp - 60000;

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

      const history: UserHistoryItem[] = await provider.getUserHistory({
        startTime: searchStartTime,
        endTime: undefined,
      });

      const safeHistory = Array.isArray(history) ? history : [];

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

      const matchingCompleted = completedWithdrawals.find(
        (completed) =>
          completed.timestamp > oldestPending.timestamp &&
          (lastCompletedTimestamp === null ||
            completed.timestamp > lastCompletedTimestamp ||
            (completed.timestamp === lastCompletedTimestamp &&
              !lastCompletedTxHashes.includes(completed.txHash))),
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
  }, [pendingQueue, lastCompletedTimestamp, lastCompletedTxHashes]);

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

  useEffect(() => {
    if (pendingQueue.length === 0 || !oldestPendingTimestamp) {
      return;
    }

    DevLogger.log(
      'useWithdrawalRequests: Starting polling for withdrawal completion (FIFO)',
      {
        queueLength: pendingQueue.length,
        oldestSubmittedAt: new Date(oldestPendingTimestamp).toISOString(),
      },
    );

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
