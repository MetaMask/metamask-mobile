import { useCallback, useEffect, useState, useMemo } from 'react';
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

  // Combine pending and completed withdrawals
  const allWithdrawals = useMemo(() => {
    // More nuanced approach: only mark as completed if we have a matching completed withdrawal
    // with a transaction hash (indicating it reached Arbitrum)
    const combined = [...pendingWithdrawals, ...completedWithdrawals];

    // Remove duplicates by matching pending/bridging withdrawals with completed ones
    const uniqueWithdrawals = combined.reduce((acc, withdrawal) => {
      // For pending and bridging withdrawals, keep them as-is
      if (withdrawal.status === 'pending' || withdrawal.status === 'bridging') {
        acc.push(withdrawal);
        return acc;
      }

      // For completed withdrawals, try to match with a pending or bridging one
      if (withdrawal.status === 'completed') {
        // Only match if the completed withdrawal has a transaction hash (reached Arbitrum)
        if (withdrawal.txHash) {
          // Look for a pending or bridging withdrawal with similar timestamp and amount
          const pendingMatch = acc.findIndex((w) => {
            if (w.status !== 'pending' && w.status !== 'bridging') {
              return false;
            }

            // More flexible amount matching - allow for small differences
            const amountDiff = Math.abs(
              parseFloat(w.amount) - parseFloat(withdrawal.amount),
            );
            const isAmountMatch = amountDiff < 0.01; // Allow up to 1 cent difference

            // More flexible timestamp matching - allow up to 15 minutes
            const timeDiff = Math.abs(w.timestamp - withdrawal.timestamp);
            const isTimeMatch = timeDiff < 900000; // 15 minutes

            // Asset must match
            const isAssetMatch = w.asset === withdrawal.asset;

            return isAmountMatch && isTimeMatch && isAssetMatch;
          });

          if (pendingMatch >= 0) {
            // Update the pending/bridging withdrawal with completed data
            const matchedWithdrawal = acc[pendingMatch];
            acc[pendingMatch] = {
              ...matchedWithdrawal,
              status: 'completed',
              txHash: withdrawal.txHash,
              withdrawalId: withdrawal.withdrawalId,
            };

            // Update the controller state to reflect the completion
            const controller = Engine.context.PerpsController;
            if (controller) {
              controller.updateWithdrawalStatus(
                matchedWithdrawal.id,
                'completed',
                withdrawal.txHash,
              );
            }
          } else {
            // No pending/bridging match found, add as new completed withdrawal
            acc.push(withdrawal);
          }
        } else {
          // Completed withdrawal without txHash - don't match, keep as separate
          acc.push(withdrawal);
        }
      } else {
        // For failed withdrawals, add as-is
        acc.push(withdrawal);
      }

      return acc;
    }, [] as WithdrawalRequest[]);

    // Sort by timestamp (newest first)
    const sorted = uniqueWithdrawals.sort((a, b) => b.timestamp - a.timestamp);

    return sorted;
  }, [pendingWithdrawals, completedWithdrawals]);

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
