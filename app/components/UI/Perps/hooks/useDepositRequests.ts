import { useCallback, useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { usePerpsSelector } from './usePerpsSelector';
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

  // Get current selected account address
  const selectedAddress = useSelector(selectSelectedInternalAccountByScope)(
    'eip155:1',
  )?.address;

  // Get pending/bridging deposits from controller state and filter by current account
  const pendingDeposits = usePerpsSelector((state) => {
    const allDeposits = state?.depositRequests || [];

    // If no selected address, return empty array (don't show potentially wrong account's data)
    if (!selectedAddress) {
      DevLogger.log(
        'useDepositRequests: No selected address, returning empty array',
        {
          totalCount: allDeposits.length,
        },
      );
      return [];
    }

    // Filter by current account, normalizing addresses for comparison
    const filtered = allDeposits.filter((req) => {
      const match =
        req.accountAddress?.toLowerCase() === selectedAddress.toLowerCase();
      return match;
    });

    DevLogger.log('useDepositRequests: Filtered deposits by account', {
      selectedAddress,
      totalCount: allDeposits.length,
      filteredCount: filtered.length,
      deposits: filtered.map((d) => ({
        id: d.id,
        timestamp: new Date(d.timestamp).toISOString(),
        amount: d.amount,
        asset: d.asset,
        status: d.status,
        accountAddress: d.accountAddress,
      })),
    });

    return filtered;
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

      // Transform ledger updates to deposit requests
      // Handle cases where updates might be undefined or null
      const updatesArray = Array.isArray(updates) ? updates : [];

      // Get current account address for completed deposits
      // Since we're fetching deposits for the current account, all completed deposits belong to it
      // Note: selectedAddress is guaranteed to exist due to early return above
      const currentAccountAddress = selectedAddress;

      const depositData = (
        updatesArray as {
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
          accountAddress: currentAccountAddress, // Completed deposits belong to current account
          txHash: update.hash,
          success: true, // Completed deposits from ledger are successful
          status: 'completed' as const, // HyperLiquid ledger updates are completed transactions
          source: undefined, // Not available in ledger updates
          depositId: update.delta.nonce?.toString(), // Use nonce as deposit ID if available
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

    // Only show completed deposits with actual amounts from HyperLiquid API
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
