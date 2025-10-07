import { useCallback, useEffect, useState, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';

export interface WithdrawalRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
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

  // Get pending withdrawals from controller state (real-time)
  const pendingWithdrawals = usePerpsSelector(
    (state) => state?.withdrawalRequests || [],
  );

  console.log('Pending withdrawals from controller state:', {
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

      console.log('Fetching completed withdrawals from HyperLiquid API...');

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

      console.log('Fetching withdrawals from:', {
        searchStartTime: new Date(searchStartTime).toISOString(),
        currentTime: now.toISOString(),
        isToday: searchStartTime === startOfToday,
      });

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

      console.log('Raw ledger updates from HyperLiquid:', {
        count: updates?.length || 0,
        latestTimestamp: (updates as { time: number }[])?.[0]?.time
          ? new Date((updates as { time: number }[])[0].time).toISOString()
          : 'N/A',
        oldestTimestamp: (updates as { time: number }[])?.[updates.length - 1]
          ?.time
          ? new Date(
              (updates as { time: number }[])[updates.length - 1].time,
            ).toISOString()
          : 'N/A',
      });

      // Transform ledger updates to withdrawal requests
      const withdrawalData = (
        updates as {
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
          txHash: update.hash,
          status: 'completed' as const, // HyperLiquid ledger updates are completed transactions
          destination: undefined, // Not available in ledger updates
          withdrawalId: update.delta.nonce?.toString(), // Use nonce as withdrawal ID if available
        }));

      console.log('Processed completed withdrawals:', {
        count: withdrawalData.length,
        withdrawals: withdrawalData.map((w) => ({
          id: w.id,
          timestamp: new Date(w.timestamp).toISOString(),
          amount: w.amount,
          asset: w.asset,
        })),
      });

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
  }, [startTime]);

  // Combine pending and completed withdrawals
  const allWithdrawals = useMemo(() => {
    console.log('Combining withdrawals:', {
      pendingCount: pendingWithdrawals.length,
      completedCount: completedWithdrawals.length,
    });

    // Combine both sources and sort by timestamp (newest first)
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
        // Look for a pending or bridging withdrawal with similar timestamp and amount
        const pendingMatch = acc.findIndex(
          (w) =>
            (w.status === 'pending' || w.status === 'bridging') &&
            w.amount === withdrawal.amount &&
            w.asset === withdrawal.asset &&
            Math.abs(w.timestamp - withdrawal.timestamp) < 300000, // Within 5 minutes
        );

        if (pendingMatch >= 0) {
          // Update the pending/bridging withdrawal with completed data
          acc[pendingMatch] = {
            ...acc[pendingMatch],
            status: 'completed',
            txHash: withdrawal.txHash,
            withdrawalId: withdrawal.withdrawalId,
          };
          console.log('Matched and updated withdrawal:', {
            originalId: acc[pendingMatch].id,
            originalStatus: acc[pendingMatch].status,
            newStatus: 'completed',
            txHash: withdrawal.txHash,
          });
        } else {
          // No pending/bridging match found, add as new completed withdrawal
          acc.push(withdrawal);
          console.log('No match found, added new completed withdrawal:', {
            id: withdrawal.id,
            amount: withdrawal.amount,
            timestamp: new Date(withdrawal.timestamp).toISOString(),
          });
        }
      } else {
        // For failed withdrawals, add as-is
        acc.push(withdrawal);
      }

      return acc;
    }, [] as WithdrawalRequest[]);

    // Sort by timestamp (newest first)
    const sorted = uniqueWithdrawals.sort((a, b) => b.timestamp - a.timestamp);

    console.log('Final combined withdrawals:', {
      count: sorted.length,
      withdrawals: sorted.map((w) => ({
        id: w.id,
        timestamp: new Date(w.timestamp).toISOString(),
        amount: w.amount,
        asset: w.asset,
        status: w.status,
        txHash: w.txHash
          ? `${w.txHash.slice(0, 8)}...${w.txHash.slice(-6)}`
          : 'none',
      })),
    });

    return sorted;
  }, [pendingWithdrawals, completedWithdrawals]);

  // Initial fetch when component mounts
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchCompletedWithdrawals();
    }
  }, [fetchCompletedWithdrawals, skipInitialFetch]);

  return {
    withdrawalRequests: allWithdrawals,
    isLoading,
    error,
    refetch: fetchCompletedWithdrawals,
  };
};
