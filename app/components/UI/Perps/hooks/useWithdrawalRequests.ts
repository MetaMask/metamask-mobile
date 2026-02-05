import { useCallback, useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';

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
   * Start time for fetching withdrawal requests (in milliseconds)
   * Defaults to 0 to get all historical withdrawals
   */
  startTime?: number;
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
 * Hook to fetch and track withdrawal requests.
 *
 * Simplified flow:
 * 1. When withdrawInProgress is true, poll the ledger API for completed withdrawals
 * 2. Compare latest withdrawal's txHash with lastWithdrawResult.txHash
 * 3. When different (new withdrawal detected), call completeWithdrawalFromLedger()
 * 4. This clears pending requests and updates lastWithdrawResult
 *
 * Recovery: On mount, if withdrawInProgress is true, immediately check for completion
 */
export const useWithdrawalRequests = (
  options: UseWithdrawalRequestsOptions = {},
): UseWithdrawalRequestsResult => {
  const { startTime = 0, skipInitialFetch = false } = options;

  // Get current selected account address
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  // Get withdrawal state from controller
  const withdrawInProgress = usePerpsSelector(
    (state) => state?.withdrawInProgress ?? false,
  );
  const lastWithdrawResult = usePerpsSelector(
    (state) => state?.lastWithdrawResult ?? null,
  );

  // Get pending withdrawals from controller state, filtered by current account
  const pendingWithdrawals = useStableArray(
    usePerpsSelector((state) => {
      const allWithdrawals = state?.withdrawalRequests || [];
      if (!selectedAddress) return [];
      return allWithdrawals.filter(
        (req) =>
          req.accountAddress?.toLowerCase() === selectedAddress.toLowerCase(),
      );
    }),
  );

  const [completedWithdrawals, setCompletedWithdrawals] = useState<
    WithdrawalRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  // Track if we've already processed a completion to prevent duplicate calls
  const hasProcessedCompletionRef = useRef(false);

  // Reset the processed flag when withdrawInProgress changes to true (new withdrawal started)
  useEffect(() => {
    if (withdrawInProgress) {
      hasProcessedCompletionRef.current = false;
    }
  }, [withdrawInProgress]);

  /**
   * Fetch completed withdrawals from the ledger API
   */
  const fetchCompletedWithdrawals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!selectedAddress) {
        DevLogger.log(
          'fetchCompletedWithdrawals: No selected address, skipping fetch',
        );
        setIsLoading(false);
        return;
      }

      const controller = Engine.context.PerpsController;
      if (!controller) {
        throw new Error('PerpsController not available');
      }

      const provider = controller.getActiveProvider();
      if (!provider) {
        throw new Error('No active provider available');
      }

      if (!('getUserNonFundingLedgerUpdates' in provider)) {
        throw new Error('Provider does not support non-funding ledger updates');
      }

      const updates = await (
        provider as {
          getUserNonFundingLedgerUpdates: (
            params: unknown,
          ) => Promise<unknown[]>;
        }
      ).getUserNonFundingLedgerUpdates({
        startTime,
        endTime: undefined,
      });

      const safeUpdates = Array.isArray(updates) ? updates : [];

      // Transform ledger updates to withdrawal requests (filter for withdrawals only)
      const withdrawalData = (
        safeUpdates as {
          delta: {
            coin?: string;
            usdc: string;
            type: string;
            fee?: string;
            nonce?: number;
          };
          hash: string;
          time: number;
        }[]
      )
        .filter((update) => update.delta.type === 'withdraw')
        .map((update) => ({
          id: `withdrawal-${update.hash}`,
          timestamp: update.time,
          amount: Math.abs(parseFloat(update.delta.usdc)).toString(),
          asset: update.delta.coin || 'USDC',
          accountAddress: selectedAddress,
          txHash: update.hash,
          status: 'completed' as const,
          destination: undefined,
          withdrawalId: update.delta.nonce?.toString(),
        }));

      setCompletedWithdrawals(withdrawalData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch completed withdrawals';
      console.error('Error fetching completed withdrawals:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [startTime, selectedAddress]);

  /**
   * Check if a new withdrawal has completed and update controller state
   * Simplified logic: compare latest withdrawal's txHash with lastWithdrawResult.txHash
   */
  const checkForWithdrawalCompletion = useCallback(() => {
    // Skip if not waiting for a withdrawal to complete
    if (!withdrawInProgress) return;

    // Skip if we've already processed this completion
    if (hasProcessedCompletionRef.current) return;

    // Get the latest completed withdrawal (sorted by timestamp, newest first)
    const latestWithdrawal = completedWithdrawals[0];
    if (!latestWithdrawal?.txHash) return;

    // Compare with lastWithdrawResult - if different, we have a new completed withdrawal
    const lastKnownTxHash = lastWithdrawResult?.txHash;

    if (latestWithdrawal.txHash !== lastKnownTxHash) {
      DevLogger.log(
        'useWithdrawalRequests: New withdrawal detected, completing',
        {
          newTxHash: latestWithdrawal.txHash,
          lastKnownTxHash,
          amount: latestWithdrawal.amount,
        },
      );

      // Mark as processed to prevent duplicate calls
      hasProcessedCompletionRef.current = true;

      // Update controller state
      const controller = Engine.context.PerpsController;
      if (controller) {
        controller.completeWithdrawalFromLedger({
          txHash: latestWithdrawal.txHash,
          amount: latestWithdrawal.amount,
          timestamp: latestWithdrawal.timestamp,
          asset: latestWithdrawal.asset,
        });
      }
    }
  }, [withdrawInProgress, completedWithdrawals, lastWithdrawResult?.txHash]);

  // Check for completion whenever completedWithdrawals changes
  useEffect(() => {
    checkForWithdrawalCompletion();
  }, [checkForWithdrawalCompletion]);

  // Initial fetch and recovery check on mount
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchCompletedWithdrawals();
    }
  }, [fetchCompletedWithdrawals, skipInitialFetch]);

  // Poll for completed withdrawals when withdrawInProgress is true
  useEffect(() => {
    if (!withdrawInProgress) {
      return; // No need to poll if no withdrawal in progress
    }

    DevLogger.log(
      'useWithdrawalRequests: Starting polling for withdrawal completion',
    );

    // Poll every 10 seconds when waiting for withdrawal to complete
    const pollInterval = setInterval(() => {
      fetchCompletedWithdrawals();
    }, 10000);

    return () => {
      clearInterval(pollInterval);
    };
  }, [withdrawInProgress, fetchCompletedWithdrawals]);

  // Combine pending and completed for display
  // Pending withdrawals show in-progress state, completed show history
  const allWithdrawals = [...pendingWithdrawals, ...completedWithdrawals]
    // Remove duplicates (prefer pending over completed if same txHash)
    .filter((withdrawal, index, self) => {
      if (!withdrawal.txHash) return true;
      return index === self.findIndex((w) => w.txHash === withdrawal.txHash);
    })
    // Sort by timestamp (newest first)
    .sort((a, b) => b.timestamp - a.timestamp);

  return {
    withdrawalRequests: allWithdrawals,
    isLoading,
    error,
    refetch: fetchCompletedWithdrawals,
  };
};
