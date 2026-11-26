import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
import { useStableArray } from './useStableArray';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';

export interface DepositRequest {
  id: string;
  timestamp: number;
  amount: string;
  asset: string;
  accountAddress: string; // Account that initiated this deposit
  txHash?: string;
  success: boolean;
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

const EMPTY_DEPOSIT_REQUESTS: DepositRequest[] = [];

/**
 * Hook to fetch deposit requests combining:
 * 1. Pending/bridging deposits from PerpsController state (real-time)
 * 2. Completed deposits from the active provider's `getUserHistory` (historical)
 *
 * This provides the complete deposit lifecycle from initiation to completion
 */
export const useDepositRequests = (
  options: UseDepositRequestsOptions = {},
): UseDepositRequestsResult => {
  const { startTime, skipInitialFetch = false } = options;

  // Get current selected account address
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  // Total count of deposits across all accounts (primitive — safe to read every
  // dispatch without triggering re-renders, used for logging context only).
  const totalDepositCount = usePerpsSelector(
    (state) => state?.depositRequests?.length ?? 0,
  );

  // Get pending/bridging deposits from controller state and filter by current
  // account. The selector returns a fresh array on every dispatch, so wrap it in
  // useStableArray to keep a stable reference when the contents are unchanged.
  // This prevents consumers from re-rendering on unrelated PerpsController
  // dispatches. Logging is intentionally kept out of the selector (see effect
  // below) so it does not run on every dispatch.
  const pendingDeposits = useStableArray(
    usePerpsSelector((state) => {
      const allDeposits = state?.depositRequests ?? EMPTY_DEPOSIT_REQUESTS;

      // If no selected address, return empty array (don't show potentially wrong account's data)
      if (!selectedAddress || allDeposits.length === 0) {
        return EMPTY_DEPOSIT_REQUESTS;
      }

      // Filter by current account, normalizing addresses for comparison
      return allDeposits.filter(
        (req) =>
          req.accountAddress?.toLowerCase() === selectedAddress.toLowerCase(),
      );
    }),
  );

  useEffect(() => {
    if (!selectedAddress) {
      DevLogger.log(
        'useDepositRequests: No selected address, returning empty array',
        {
          totalCount: totalDepositCount,
        },
      );
      return;
    }

    DevLogger.log('useDepositRequests: Filtered deposits by account', {
      selectedAddress,
      totalCount: totalDepositCount,
      filteredCount: pendingDeposits.length,
      deposits: pendingDeposits.map((d) => ({
        id: d.id,
        timestamp: new Date(d.timestamp).toISOString(),
        amount: d.amount,
        asset: d.asset,
        status: d.status,
        accountAddress: d.accountAddress,
      })),
    });
  }, [selectedAddress, totalDepositCount, pendingDeposits]);

  const [completedDeposits, setCompletedDeposits] = useState<DepositRequest[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(!skipInitialFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletedDeposits = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Skip fetch if no selected address - can't attribute deposits to unknown account
      if (!selectedAddress) {
        DevLogger.log(
          'fetchCompletedDeposits: No selected address, skipping fetch',
        );
        setIsLoading(false);
        return;
      }

      const controller = Engine.context.PerpsController;
      if (!controller) {
        throw new Error('PerpsController not available');
      }

      const provider = controller.getActiveProviderOrNull();
      if (!provider) {
        setIsLoading(false);
        return;
      }

      // Use provided startTime or default to start of today (midnight UTC)
      const now = new Date();
      const startOfToday = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
      ).getTime();
      const searchStartTime = startTime ?? startOfToday;

      // Provider history is already venue-adapted (`UserHistoryItem`).
      const history = await provider.getUserHistory({
        startTime: searchStartTime,
      });

      // Since we're fetching deposits for the current account, all completed deposits belong to it
      // Note: selectedAddress is guaranteed to exist due to early return above
      const currentAccountAddress = selectedAddress;

      const depositData: DepositRequest[] = history
        .filter((item) => item.type === 'deposit')
        .map((item) => ({
          id: item.id,
          timestamp: item.timestamp,
          amount: item.amount,
          asset: item.asset,
          accountAddress: currentAccountAddress, // Completed deposits belong to current account
          txHash: item.txHash,
          success: item.status === 'completed',
          status: item.status,
          source: item.details.source || undefined,
        }));

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
  }, [selectedAddress, startTime]);

  // Combine pending and completed deposits
  const allDeposits = useMemo(() => {
    // Combine both sources and sort by timestamp (newest first)
    const combined = [...pendingDeposits, ...completedDeposits];

    // Only show completed deposits with actual amounts from provider history
    // Filter out pending/bridging deposits - only show when fully completed
    const uniqueDeposits = combined.filter((deposit) => {
      // Only include completed deposits with actual amounts (not "0" or "0.00")
      const isCompleted = deposit.status === 'completed';
      const hasActualAmount =
        deposit.amount !== '0' && deposit.amount !== '0.00';
      const hasTxHash = !!deposit.txHash;

      const shouldInclude = isCompleted && hasActualAmount && hasTxHash;

      return shouldInclude;
    });

    // Sort by timestamp (newest first)
    const sorted = uniqueDeposits.sort((a, b) => b.timestamp - a.timestamp);

    DevLogger.log('Final combined deposits:', {
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
      fetchCompletedDeposits().catch(() => undefined);
    }
  }, [fetchCompletedDeposits, skipInitialFetch]);

  return {
    depositRequests: allDeposits,
    isLoading,
    error,
    refetch: fetchCompletedDeposits,
  };
};
