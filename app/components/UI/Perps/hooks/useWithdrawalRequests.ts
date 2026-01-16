import { useCallback, useEffect, useState, useMemo, useRef } from 'react';
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

  // Get pending withdrawals from controller state, filtered by current account
  // useStableArray ensures we only get a new reference when the actual data changes
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

  // Track previous withdrawal states to detect meaningful changes
  const prevWithdrawalStatesRef = useRef<Map<string, string>>(new Map());

  // Log only meaningful withdrawal state changes (not on every render)
  useEffect(() => {
    const currentStates = new Map<string, string>();
    pendingWithdrawals.forEach((w) => currentStates.set(w.id, w.status));

    const prevStates = prevWithdrawalStatesRef.current;

    // Check for new withdrawals (initialized)
    for (const withdrawal of pendingWithdrawals) {
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
    for (const withdrawal of pendingWithdrawals) {
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
  }, [pendingWithdrawals]);

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

  // Clear the updated withdrawal IDs ref when account changes to prevent stale data
  // This handles the edge case where withdrawal IDs might not be globally unique
  // across accounts (e.g., sequential IDs), ensuring the new account's withdrawals
  // are properly processed
  useEffect(() => {
    if (selectedAddress) {
      updatedWithdrawalIdsRef.current.clear();
      DevLogger.log(
        'useWithdrawalRequests: Cleared updatedWithdrawalIdsRef on account change',
        { selectedAddress },
      );
    }
  }, [selectedAddress]);

  // Combine pending and completed withdrawals (pure data transformation, no side effects)
  const allWithdrawals = useMemo(() => {
    // Build a list that merges pending withdrawals with their completed counterparts
    const result: WithdrawalRequest[] = [];

    // Track which completed withdrawals have been matched to prevent
    // multiple same-amount pending withdrawals from matching the same completed one
    const matchedCompletedIds = new Set<string>();

    // First, add all pending/bridging withdrawals
    for (const pending of pendingWithdrawals) {
      if (pending.status === 'pending' || pending.status === 'bridging') {
        // Check if this pending withdrawal has a matching UNMATCHED completed one
        const matchingCompleted = completedWithdrawals.find((completed) => {
          if (!completed.txHash) return false;
          // Skip completed withdrawals that have already been matched
          if (matchedCompletedIds.has(completed.id)) return false;

          const amountDiff = Math.abs(
            parseFloat(pending.amount) - parseFloat(completed.amount),
          );
          const isAmountMatch = amountDiff < 0.01;
          const isAssetMatch = pending.asset === completed.asset;

          return isAmountMatch && isAssetMatch;
        });

        if (matchingCompleted) {
          // Mark this completed withdrawal as matched
          matchedCompletedIds.add(matchingCompleted.id);
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
        // Check if this matches an API completed withdrawal to prevent duplicates
        // This handles the case where controller state was updated in a previous render
        if (pending.status === 'completed' && pending.txHash) {
          const matchingApiCompleted = completedWithdrawals.find(
            (completed) => completed.txHash === pending.txHash,
          );
          if (matchingApiCompleted) {
            matchedCompletedIds.add(matchingApiCompleted.id);
          }
        }
        result.push(pending);
      }
    }

    // Add completed withdrawals that weren't matched to any pending ones
    // (historical withdrawals that were completed before the app started tracking)
    for (const completed of completedWithdrawals) {
      // Skip if already matched to a pending withdrawal
      if (matchedCompletedIds.has(completed.id)) {
        continue;
      }

      if (!completed.txHash) {
        result.push(completed);
        continue;
      }

      // This completed withdrawal wasn't matched, add it to results
      result.push(completed);
    }

    // Sort by timestamp (newest first)
    return result.sort((a, b) => b.timestamp - a.timestamp);
  }, [pendingWithdrawals, completedWithdrawals]);

  // Update controller state when we detect completed withdrawals that match pending ones
  // This is a side effect that should be in useEffect, not useMemo
  useEffect(() => {
    const controller = Engine.context.PerpsController;
    if (!controller) return;

    // Track which pending withdrawals have been matched in THIS render cycle
    // to prevent multiple completed withdrawals from matching the same pending one
    const matchedPendingIdsThisCycle = new Set<string>();

    for (const completed of completedWithdrawals) {
      // Skip if no txHash (not confirmed on chain)
      if (!completed.txHash) continue;

      // Find first UNMATCHED pending withdrawal that matches this completed one
      const matchingPending = pendingWithdrawals.find((w) => {
        if (w.status !== 'pending' && w.status !== 'bridging') {
          return false;
        }
        // Skip if already matched in this render cycle
        if (matchedPendingIdsThisCycle.has(w.id)) {
          return false;
        }
        // Skip if already updated in a previous render cycle
        if (updatedWithdrawalIdsRef.current.has(w.id)) {
          return false;
        }

        // Match by amount - allow for small differences (fees, rounding)
        const amountDiff = Math.abs(
          parseFloat(w.amount) - parseFloat(completed.amount),
        );
        const isAmountMatch = amountDiff < 0.01;

        // Asset must match
        const isAssetMatch = w.asset === completed.asset;

        return isAmountMatch && isAssetMatch;
      });

      if (matchingPending) {
        // Mark as matched in this cycle to prevent another completed from matching it
        matchedPendingIdsThisCycle.add(matchingPending.id);

        DevLogger.log(
          'useWithdrawalRequests: Updating withdrawal status to completed',
          {
            pendingId: matchingPending.id,
            txHash: completed.txHash,
            amount: completed.amount,
          },
        );

        // Mark as updated to prevent duplicate calls across render cycles
        updatedWithdrawalIdsRef.current.add(matchingPending.id);

        // Update the controller state to reflect the completion
        controller.updateWithdrawalStatus(
          matchingPending.id,
          'completed',
          completed.txHash,
        );
      }
    }
  }, [completedWithdrawals, pendingWithdrawals]);

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
