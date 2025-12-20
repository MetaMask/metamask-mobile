import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
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
   * Defaults to start of today to see today's withdrawals
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
 * Hook to fetch withdrawal requests combining:
 * 1. Pending withdrawals from PerpsController state (real-time)
 * 2. Completed withdrawals from HyperLiquid API (historical)
 *
 * This provides the complete withdrawal lifecycle from initiation to completion
 */
export const useWithdrawalRequests = (
  options: UseWithdrawalRequestsOptions = {},
): UseWithdrawalRequestsResult => {
  const { startTime, skipInitialFetch = false } = options;

  // Get current selected account address
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  // Get pending withdrawals from controller state and filter by current account
  const pendingWithdrawals = usePerpsSelector((state) => {
    const allWithdrawals = state?.withdrawalRequests || [];

    // If no selected address, return empty array (don't show potentially wrong account's data)
    if (!selectedAddress) {
      DevLogger.log(
        'useWithdrawalRequests: No selected address, returning empty array',
        {
          totalCount: allWithdrawals.length,
        },
      );
      return [];
    }

    // Filter by current account, normalizing addresses for comparison
    const filtered = allWithdrawals.filter((req) => {
      const match =
        req.accountAddress?.toLowerCase() === selectedAddress.toLowerCase();
      return match;
    });

    DevLogger.log('useWithdrawalRequests: Filtered withdrawals by account', {
      selectedAddress,
      totalCount: allWithdrawals.length,
      filteredCount: filtered.length,
      withdrawals: filtered.map((w) => ({
        id: w.id,
        accountAddress: w.accountAddress,
        status: w.status,
      })),
    });

    return filtered;
  });

  DevLogger.log('Pending withdrawals from controller state:', {
    count: pendingWithdrawals.length,
    withdrawals: pendingWithdrawals.map((w) => ({
      id: w.id,
      timestamp: new Date(w.timestamp).toISOString(),
      amount: w.amount,
      asset: w.asset,
      status: w.status,
    })),
  });
  const [completedWithdrawals, setCompletedWithdrawals] = useState<
    WithdrawalRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletedWithdrawals = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Skip fetch if no selected address - can't attribute withdrawals to unknown account
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

      // Check if provider has the getUserNonFundingLedgerUpdates method
      if (!('getUserNonFundingLedgerUpdates' in provider)) {
        throw new Error('Provider does not support non-funding ledger updates');
      }

      // Use provided startTime or default to start of today (midnight UTC)
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
      const searchStartTime = startTime ?? startOfToday;

      const updates = await (
        provider as {
          getUserNonFundingLedgerUpdates: (
            params: unknown,
          ) => Promise<unknown[]>;
        }
      ).getUserNonFundingLedgerUpdates({
        startTime: searchStartTime,
        endTime: undefined,
      });

      // Ensure updates is an array before processing
      const safeUpdates = Array.isArray(updates) ? updates : [];

      // Transform ledger updates to withdrawal requests
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
        .filter((update) => {
          const isWithdrawal = update.delta.type === 'withdraw';
          return isWithdrawal;
        })
        .map((update) => ({
          id: `withdrawal-${update.hash}`,
          timestamp: update.time,
          amount: Math.abs(parseFloat(update.delta.usdc)).toString(),
          asset: update.delta.coin || 'USDC', // Default to USDC if coin is not specified
          accountAddress: selectedAddress, // selectedAddress is guaranteed to exist due to early return above
          txHash: update.hash,
          status: 'completed' as const, // HyperLiquid ledger updates are completed transactions
          destination: undefined, // Not available in ledger updates
          withdrawalId: update.delta.nonce?.toString(), // Use nonce as withdrawal ID if available
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

  // Track which withdrawals have already been updated in the controller
  // to prevent duplicate updateWithdrawalStatus calls
  const updatedWithdrawalIdsRef = useRef<Set<string>>(new Set());

  /**
   * Helper function to find a matching pending/bridging withdrawal for a completed one
   * Matches by amount and asset only - timestamps can differ significantly for bridging
   * operations (can take hours, not just 15 minutes)
   */
  const findMatchingPendingWithdrawal = useCallback(
    (
      completedWithdrawal: WithdrawalRequest,
      pendingList: WithdrawalRequest[],
    ): WithdrawalRequest | undefined =>
      pendingList.find((w) => {
        if (w.status !== 'pending' && w.status !== 'bridging') {
          return false;
        }

        // Match by amount - allow for small differences (fees, rounding)
        const amountDiff = Math.abs(
          parseFloat(w.amount) - parseFloat(completedWithdrawal.amount),
        );
        const isAmountMatch = amountDiff < 0.01; // Allow up to 1 cent difference

        // Asset must match
        const isAssetMatch = w.asset === completedWithdrawal.asset;

        // Note: Removed timestamp constraint - bridging operations from HyperLiquid
        // to Arbitrum can take hours, so matching by initiation vs completion time
        // is unreliable. Amount + asset matching is sufficient for deduplication.

        return isAmountMatch && isAssetMatch;
      }),
    [],
  );

  // Combine pending and completed withdrawals (pure data transformation, no side effects)
  const allWithdrawals = useMemo(() => {
    // Build a list that merges pending withdrawals with their completed counterparts
    const result: WithdrawalRequest[] = [];

    // First, add all pending/bridging withdrawals
    for (const pending of pendingWithdrawals) {
      if (pending.status === 'pending' || pending.status === 'bridging') {
        // Check if this pending withdrawal has a matching completed one
        const matchingCompleted = completedWithdrawals.find((completed) => {
          if (!completed.txHash) return false;

          const amountDiff = Math.abs(
            parseFloat(pending.amount) - parseFloat(completed.amount),
          );
          const isAmountMatch = amountDiff < 0.01;
          const isAssetMatch = pending.asset === completed.asset;

          return isAmountMatch && isAssetMatch;
        });

        if (matchingCompleted) {
          // Merge: use pending's ID but update with completed data
          result.push({
            ...pending,
            status: 'completed',
            txHash: matchingCompleted.txHash,
            withdrawalId: matchingCompleted.withdrawalId,
          });
        } else {
          // No match found, keep as pending/bridging
          result.push(pending);
        }
      } else {
        // Already completed or failed in controller state
        result.push(pending);
      }
    }

    // Add completed withdrawals that don't match any pending ones
    // (historical withdrawals that were completed before the app started tracking)
    for (const completed of completedWithdrawals) {
      if (!completed.txHash) {
        result.push(completed);
        continue;
      }

      const hasPendingMatch = pendingWithdrawals.some((pending) => {
        if (pending.status !== 'pending' && pending.status !== 'bridging') {
          return false;
        }
        const amountDiff = Math.abs(
          parseFloat(pending.amount) - parseFloat(completed.amount),
        );
        return amountDiff < 0.01 && pending.asset === completed.asset;
      });

      if (!hasPendingMatch) {
        result.push(completed);
      }
    }

    // Sort by timestamp (newest first)
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [pendingWithdrawals, completedWithdrawals]);

  // Update controller state when we detect completed withdrawals that match pending ones
  // This is a side effect that should be in useEffect, not useMemo
  useEffect(() => {
    const controller = Engine.context.PerpsController;
    if (!controller) return;

    for (const completed of completedWithdrawals) {
      // Skip if no txHash (not confirmed on chain)
      if (!completed.txHash) continue;

      // Find matching pending withdrawal in controller state
      const matchingPending = findMatchingPendingWithdrawal(
        completed,
        pendingWithdrawals,
      );

      if (matchingPending) {
        // Check if we've already updated this withdrawal to prevent duplicate calls
        if (updatedWithdrawalIdsRef.current.has(matchingPending.id)) {
          continue;
        }

        DevLogger.log(
          'useWithdrawalRequests: Updating withdrawal status to completed',
          {
            pendingId: matchingPending.id,
            txHash: completed.txHash,
            amount: completed.amount,
          },
        );

        // Mark as updated before calling to prevent race conditions
        updatedWithdrawalIdsRef.current.add(matchingPending.id);

        // Update the controller state to reflect the completion
        controller.updateWithdrawalStatus(
          matchingPending.id,
          'completed',
          completed.txHash,
        );
      }
    }
  }, [completedWithdrawals, pendingWithdrawals, findMatchingPendingWithdrawal]);

  // Initial fetch when component mounts
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchCompletedWithdrawals();
    }
  }, [fetchCompletedWithdrawals, skipInitialFetch]);

  // Poll for completed withdrawals when there are active withdrawals
  useEffect(() => {
    const hasActiveWithdrawals = pendingWithdrawals.some(
      (w) => w.status === 'pending' || w.status === 'bridging',
    );

    if (!hasActiveWithdrawals) {
      return; // No need to poll if no active withdrawals
    }

    // Poll every 10 seconds when there are active withdrawals
    const pollInterval = setInterval(() => {
      fetchCompletedWithdrawals();
    }, 10000); // 10 seconds

    return () => {
      clearInterval(pollInterval);
    };
  }, [pendingWithdrawals, fetchCompletedWithdrawals]);

  return {
    withdrawalRequests: allWithdrawals,
    isLoading,
    error,
    refetch: fetchCompletedWithdrawals,
  };
};
