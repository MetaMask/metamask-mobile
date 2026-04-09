import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  PERPS_CONSTANTS,
  type UserHistoryItem,
} from '@metamask/perps-controller';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { ensureError } from '../../../../util/errorUtils';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';

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

const WITHDRAWAL_POLL_INTERVAL_MS = 5000;
const WITHDRAWAL_SEARCH_BUFFER_MS = 60000;

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

  const initialFetchDoneRef = useRef(false);
  const isFetchingRef = useRef(false);
  const addressRef = useRef(selectedAddress);
  addressRef.current = selectedAddress;

  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pendingQueue.length === 0) {
      setIsLoading(false);
    }
  }, [pendingQueue.length]);

  /**
   * Fetches history and applies FIFO completion matching. Does not touch
   * `isLoading` or `isFetchingRef` — callers must hold the fetch lock and
   * decide whether the run is user-visible (loading) or background (poll).
   *
   * Returns immediately when the pending queue is empty (no history fetch).
   */
  const executeWithdrawalCompletionCheck = useCallback(async () => {
    try {
      setError(null);

      if (pendingQueue.length === 0) {
        return;
      }

      const controller = Engine.context.PerpsController;
      if (!controller) {
        return;
      }

      const provider = controller.getActiveProviderOrNull();
      if (!provider || !('getUserHistory' in provider)) {
        return;
      }

      const oldestPending = pendingQueue[0];
      const searchStartTime =
        oldestPending.timestamp - WITHDRAWAL_SEARCH_BUFFER_MS;

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
        return;
      }

      const matchingCompleted = completedWithdrawals.find(
        (completed) =>
          completed.timestamp > oldestPending.timestamp &&
          !lastCompletedTxHashes.includes(completed.txHash) &&
          (lastCompletedTimestamp === null ||
            completed.timestamp >= lastCompletedTimestamp),
      );

      if (!matchingCompleted) {
        return;
      }

      controller.completeWithdrawalFromHistory(oldestPending.id, {
        txHash: matchingCompleted.txHash,
        amount: matchingCompleted.amount,
        timestamp: matchingCompleted.timestamp,
        asset: matchingCompleted.asset,
      });
    } catch (err) {
      const errorInstance = ensureError(
        err,
        'useWithdrawalRequests.executeWithdrawalCompletionCheck',
      );
      const accountAddress = addressRef.current ?? 'unknown';

      Logger.error(errorInstance, {
        tags: {
          feature: PERPS_CONSTANTS.FeatureName,
        },
        context: {
          name: 'useWithdrawalRequests.executeWithdrawalCompletionCheck',
          data: {
            accountAddress,
            pendingQueueLength: pendingQueue.length,
            oldestPendingWithdrawalId: pendingQueue[0]?.id,
          },
        },
      });

      setError(errorInstance.message);
    }
  }, [pendingQueue, lastCompletedTimestamp, lastCompletedTxHashes]);

  /** Background poll: same completion logic without toggling `isLoading`. */
  const runWithdrawalCompletionCheck = useCallback(async () => {
    if (pendingQueue.length === 0) {
      return;
    }

    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;

    try {
      await executeWithdrawalCompletionCheck();
    } finally {
      isFetchingRef.current = false;
    }
  }, [executeWithdrawalCompletionCheck, pendingQueue.length]);

  /** Initial fetch and `refetch`: completion logic with loading indicator. */
  const checkForWithdrawalCompletion = useCallback(async () => {
    if (pendingQueue.length === 0) {
      return;
    }

    if (isFetchingRef.current) {
      return;
    }
    isFetchingRef.current = true;
    setIsLoading(true);

    try {
      await executeWithdrawalCompletionCheck();
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [executeWithdrawalCompletionCheck, pendingQueue.length]);

  useEffect(() => {
    if (pendingQueue.length === 0) {
      initialFetchDoneRef.current = false;
      return;
    }
    if (!skipInitialFetch && !initialFetchDoneRef.current) {
      initialFetchDoneRef.current = true;
      checkForWithdrawalCompletion();
    }
  }, [checkForWithdrawalCompletion, skipInitialFetch, pendingQueue.length]);

  useEffect(() => {
    if (pendingQueue.length === 0 || !oldestPendingTimestamp) {
      return;
    }

    const pollInterval = setInterval(() => {
      runWithdrawalCompletionCheck();
    }, WITHDRAWAL_POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollInterval);
    };
  }, [
    pendingQueue.length,
    oldestPendingTimestamp,
    runWithdrawalCompletionCheck,
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
