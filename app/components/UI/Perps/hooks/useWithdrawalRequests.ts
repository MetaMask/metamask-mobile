import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';

export interface WithdrawalRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  txHash?: string;
  status: 'pending' | 'completed' | 'failed';
  destination?: string;
  withdrawalId?: string;
}

export interface UseWithdrawalRequestsOptions {
  /**
   * Start time for fetching withdrawal requests (in milliseconds)
   * Defaults to 7 days ago to match funding pattern
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
 * Hook to fetch withdrawal requests from HyperLiquid's non-funding ledger updates
 * This provides persistent withdrawal history that survives app restarts
 * Follows the same pattern as usePerpsFunding for consistency
 */
export const useWithdrawalRequests = (
  options: UseWithdrawalRequestsOptions = {},
): UseWithdrawalRequestsResult => {
  const { startTime, skipInitialFetch = false } = options;
  const [withdrawalRequests, setWithdrawalRequests] = useState<
    WithdrawalRequest[]
  >([]);
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchWithdrawalRequests = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log('Starting to fetch withdrawal requests...');

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

      console.log('Calling HyperLiquid API for ledger updates...');

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

      console.log('Processed withdrawal data:', {
        count: withdrawalData.length,
        withdrawals: withdrawalData.map((w) => ({
          id: w.id,
          timestamp: new Date(w.timestamp).toISOString(),
          amount: w.amount,
          asset: w.asset,
        })),
      });

      setWithdrawalRequests(withdrawalData);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'Failed to fetch withdrawal requests';
      console.error('Error fetching withdrawal requests:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [startTime]);

  // Initial fetch when component mounts
  useEffect(() => {
    if (!skipInitialFetch) {
      fetchWithdrawalRequests();
    }
  }, [fetchWithdrawalRequests, skipInitialFetch]);

  return {
    withdrawalRequests,
    isLoading,
    error,
    refetch: fetchWithdrawalRequests,
  };
};
