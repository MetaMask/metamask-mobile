import { useCallback, useEffect, useState, useMemo } from 'react';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';

export interface DepositRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  txHash?: string;
  status: 'pending' | 'bridging' | 'completed' | 'failed';
  source?: string;
  depositId?: string;
}

export interface UseDepositRequestsOptions {
  /**
   * Start time for fetching deposit requests (in milliseconds)
   * Defaults to start of today to see today's deposits
   */
  startTime?: number;
  /**
   * Skip initial fetch (useful for conditional loading)
   */
  skipInitialFetch?: boolean;
}

interface UseDepositRequestsResult {
  depositRequests: DepositRequest[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch deposit requests combining:
 * 1. Pending/bridging deposits from PerpsController state (real-time)
 * 2. Completed deposits from HyperLiquid API (historical)
 *
 * This provides the complete deposit lifecycle from initiation to completion
 */
export const useDepositRequests = (
  options: UseDepositRequestsOptions = {},
): UseDepositRequestsResult => {
  const { startTime, skipInitialFetch = false } = options;

  // Get pending/bridging deposits from controller state (real-time)
  const pendingDeposits = usePerpsSelector(
    (state) => state?.depositRequests || [],
  );

  console.log('Pending deposits from controller state:', {
    count: pendingDeposits.length,
    deposits: pendingDeposits.map((d) => ({
      id: d.id,
      timestamp: new Date(d.timestamp).toISOString(),
      amount: d.amount,
      asset: d.asset,
      status: d.status,
    })),
  });

  const [completedDeposits, setCompletedDeposits] = useState<DepositRequest[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletedDeposits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Fetching completed deposits from HyperLiquid API...');

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

      console.log('Fetching deposits from:', {
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

      // Transform ledger updates to deposit requests
      const depositData = (
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
          const isDeposit = update.delta.type === 'deposit';
          return isDeposit;
        })
        .map((update) => ({
          id: `deposit-${update.hash}`,
          timestamp: update.time,
          amount: Math.abs(parseFloat(update.delta.usdc)).toString(),
          asset: update.delta.coin || 'USDC', // Default to USDC if coin is not specified
          txHash: update.hash,
          status: 'completed' as const, // HyperLiquid ledger updates are completed transactions
          source: undefined, // Not available in ledger updates
          depositId: update.delta.nonce?.toString(), // Use nonce as deposit ID if available
        }));

      console.log('Processed completed deposits:', {
        count: depositData.length,
        deposits: depositData.map((d) => ({
          id: d.id,
          timestamp: new Date(d.timestamp).toISOString(),
          amount: d.amount,
          asset: d.asset,
        })),
      });

      setCompletedDeposits(depositData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch completed deposits';
      console.error('Error fetching completed deposits:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [startTime]);

  // Combine pending and completed deposits
  const allDeposits = useMemo(() => {
    console.log('Combining deposits:', {
      pendingCount: pendingDeposits.length,
      completedCount: completedDeposits.length,
    });

    // Combine both sources and sort by timestamp (newest first)
    const combined = [...pendingDeposits, ...completedDeposits];

    // Only show completed deposits with actual amounts from HyperLiquid API
    // Filter out pending/bridging deposits - only show when fully completed
    const uniqueDeposits = combined.filter((deposit) => {
      // Only include completed deposits with actual amounts (not "0" or "0.00")
      const isCompleted = deposit.status === 'completed';
      const hasActualAmount =
        deposit.amount !== '0' && deposit.amount !== '0.00';
      const hasTxHash = !!deposit.txHash;

      const shouldInclude = isCompleted && hasActualAmount && hasTxHash;

      if (!shouldInclude) {
        console.log('Filtering out deposit:', {
          id: deposit.id,
          status: deposit.status,
          amount: deposit.amount,
          hasTxHash,
          reason: !isCompleted
            ? 'not completed'
            : !hasActualAmount
            ? 'no actual amount'
            : !hasTxHash
            ? 'no txHash'
            : 'unknown',
        });
      }

      return shouldInclude;
    });

    // Sort by timestamp (newest first)
    const sorted = uniqueDeposits.sort((a, b) => b.timestamp - a.timestamp);

    console.log('Final combined deposits:', {
      count: sorted.length,
      deposits: sorted.map((d) => ({
        id: d.id,
        timestamp: new Date(d.timestamp).toISOString(),
        amount: d.amount,
        asset: d.asset,
        status: d.status,
        txHash: d.txHash
          ? `${d.txHash.slice(0, 8)}...${d.txHash.slice(-6)}`
          : 'none',
      })),
    });

    return sorted;
  }, [pendingDeposits, completedDeposits]);

  // Initial fetch when component mounts
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchCompletedDeposits();
    }
  }, [fetchCompletedDeposits, skipInitialFetch]);

  return {
    depositRequests: allDeposits,
    isLoading,
    error,
    refetch: fetchCompletedDeposits,
  };
};
