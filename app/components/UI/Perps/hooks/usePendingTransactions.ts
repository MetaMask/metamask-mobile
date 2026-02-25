import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import type { UserHistoryItem } from '@metamask/perps-controller';

export interface PendingTransaction {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  accountAddress: string;
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  type: 'deposit' | 'withdrawal';
  destination?: string;
  withdrawalId?: string;
  source?: string;
  depositId?: string;
}

export interface UsePendingTransactionsOptions {
  skipInitialFetch?: boolean;
}

interface UsePendingTransactionsResult {
  pendingDeposits: PendingTransaction[];
  pendingWithdrawals: PendingTransaction[];
  allPending: PendingTransaction[];
  hasPendingTransactions: boolean;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Combined hook to track both pending deposits and withdrawals using FIFO queue matching.
 *
 * 1. Returns pending deposits and withdrawals from PerpsController state (the queues)
 * 2. Polls getUserHistory (same API as "Deposits" tab in activity view) to detect completions
 * 3. Uses FIFO matching: oldest pending transaction matches with first completed
 * transaction in history that happened after its submission time
 *
 * Deposits and withdrawals are tracked separately - a completed deposit only clears a
 * pending deposit, and a completed withdrawal only clears a pending withdrawal.
 */
export const usePendingTransactions = (
  options: UsePendingTransactionsOptions = {},
): UsePendingTransactionsResult => {
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

  const pendingWithdrawalQueue = useMemo(
    () =>
      allWithdrawals
        .filter((req) => req.status === 'pending' || req.status === 'bridging')
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((req) => ({ ...req, type: 'withdrawal' as const })),
    [allWithdrawals],
  );

  const pendingDepositQueue = useMemo(
    () =>
      allDeposits
        .filter((req) => req.status === 'pending' || req.status === 'bridging')
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((req) => ({ ...req, type: 'deposit' as const })),
    [allDeposits],
  );

  const oldestPendingWithdrawalTimestamp =
    pendingWithdrawalQueue[0]?.timestamp ?? null;
  const oldestPendingDepositTimestamp =
    pendingDepositQueue[0]?.timestamp ?? null;

  const lastCompletedWithdrawalTimestamp = usePerpsSelector(
    (state) => state?.lastCompletedWithdrawalTimestamp ?? null,
  );
  const lastCompletedDepositTimestamp = usePerpsSelector(
    (state) => state?.lastCompletedDepositTimestamp ?? null,
  );

  const initialFetchDoneRef = useRef(false);
  const prevStatesRef = useRef<Map<string, string>>(new Map());

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

  useEffect(() => {
    if (
      pendingWithdrawalQueue.length === 0 &&
      pendingDepositQueue.length === 0
    ) {
      setIsLoading(false);
    }
  }, [pendingWithdrawalQueue.length, pendingDepositQueue.length]);

  const checkForCompletions = useCallback(async () => {
    const hasPendingWithdrawals = pendingWithdrawalQueue.length > 0;
    const hasPendingDeposits = pendingDepositQueue.length > 0;

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

      const oldestWithdrawal = pendingWithdrawalQueue[0];
      const oldestDeposit = pendingDepositQueue[0];
      const oldestTimestamp = Math.min(
        oldestWithdrawal?.timestamp ?? Infinity,
        oldestDeposit?.timestamp ?? Infinity,
      );
      const searchStartTime = oldestTimestamp - 60000;

      DevLogger.log('usePendingTransactions: Checking for completions (FIFO)', {
        pendingWithdrawals: pendingWithdrawalQueue.length,
        pendingDeposits: pendingDepositQueue.length,
        searchStartTime: new Date(searchStartTime).toISOString(),
      });

      const history: UserHistoryItem[] = await provider.getUserHistory({
        startTime: searchStartTime,
        endTime: undefined,
      });

      const safeHistory = Array.isArray(history) ? history : [];

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

  useEffect(() => {
    const hasPending =
      pendingWithdrawalQueue.length > 0 || pendingDepositQueue.length > 0;

    if (!hasPending) {
      return;
    }

    DevLogger.log('usePendingTransactions: Starting polling', {
      pendingWithdrawals: pendingWithdrawalQueue.length,
      pendingDeposits: pendingDepositQueue.length,
    });

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
