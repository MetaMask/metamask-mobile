import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Engine from '../../../../core/Engine';
import { UnrealizedPnL } from '../types';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

export interface UseUnrealizedPnLOptions {
  /**
   * The address to fetch unrealized P&L for
   */
  address?: string;
  /**
   * The provider ID to fetch unrealized P&L from
   */
  providerId?: string;
  /**
   * Whether to load unrealized P&L on mount
   * @default true
   */
  loadOnMount?: boolean;
  /**
   * Whether to refresh unrealized P&L when screen comes into focus
   * @default true
   */
  refreshOnFocus?: boolean;
}

export interface UseUnrealizedPnLResult {
  unrealizedPnL: UnrealizedPnL | null;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadUnrealizedPnL: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing unrealized P&L data with loading states
 * @param options Configuration options for the hook
 * @returns Unrealized P&L data and loading utilities
 */
export const useUnrealizedPnL = (
  options: UseUnrealizedPnLOptions = {},
): UseUnrealizedPnLResult => {
  const {
    address,
    providerId,
    loadOnMount = true,
    refreshOnFocus = true,
  } = options;

  const [unrealizedPnL, setUnrealizedPnL] = useState<UnrealizedPnL | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const loadUnrealizedPnL = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const unrealizedPnLData =
          await Engine.context.PredictController.getUnrealizedPnL({
            address: address ?? selectedInternalAccountAddress,
            providerId,
          });

        setUnrealizedPnL(unrealizedPnLData ?? null);

        DevLogger.log('useUnrealizedPnL: Loaded unrealized P&L', {
          unrealizedPnL: unrealizedPnLData,
          providerId,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to fetch unrealized P&L';
        setError(errorMessage);
        setUnrealizedPnL(null);
        DevLogger.log('useUnrealizedPnL: Error loading unrealized P&L', err);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [address, providerId, selectedInternalAccountAddress],
  );

  // Load unrealized P&L on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadUnrealizedPnL();
    }
  }, [loadOnMount, loadUnrealizedPnL]);

  // Refresh unrealized P&L when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        // Refresh unrealized P&L data when returning to this screen
        // Use refresh mode to avoid showing loading spinner
        loadUnrealizedPnL({ isRefresh: true });
      }
    }, [refreshOnFocus, loadUnrealizedPnL]),
  );

  useEffect(() => {
    setUnrealizedPnL(null);
    setIsLoading(true);
    setIsRefreshing(false);
    setError(null);
  }, [address]);

  return {
    unrealizedPnL,
    isLoading,
    isRefreshing,
    error,
    loadUnrealizedPnL,
  };
};
