import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { captureException } from '@sentry/react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { usePredictTrading } from './usePredictTrading';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { selectPredictBalanceByAddress } from '../selectors/predictController';

interface UsePredictBalanceOptions {
  /**
   * The provider ID to load balance for
   */
  providerId?: string;
  /**
   * Whether to load balance on mount
   * @default true
   */
  loadOnMount?: boolean;
  /**
   * Whether to refresh balance when screen comes into focus
   * @default true
   */
  refreshOnFocus?: boolean;
}

interface UsePredictBalanceReturn {
  balance: number;
  hasNoBalance: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadBalance: (options?: { isRefresh?: boolean }) => Promise<void>;
}

/**
 * Hook for managing Predict balance data with loading states
 * @param options Configuration options for the hook
 * @returns Balance data and loading utilities
 */
export function usePredictBalance(
  options: UsePredictBalanceOptions = {},
): UsePredictBalanceReturn {
  const {
    providerId = POLYMARKET_PROVIDER_ID,
    loadOnMount = false,
    refreshOnFocus = false,
  } = options;

  const { getBalance } = usePredictTrading();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const isLoadingRef = useRef(false);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

  const balance =
    useSelector(
      selectPredictBalanceByAddress({
        providerId,
        address: selectedInternalAccountAddress || '',
      }),
    ) || 0;

  const hasNoBalance = useMemo(
    () => !isLoading && !isRefreshing && balance === 0,
    [balance, isLoading, isRefreshing],
  );

  const loadBalance = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      // Prevent multiple simultaneous calls
      if (isLoadingRef.current) {
        DevLogger.log('usePredictBalance: Skipping load - already in progress');
        return;
      }

      const { isRefresh = false } = loadOptions || {};

      try {
        isLoadingRef.current = true;
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        // Get balance from Predict controller
        const balanceData = await getBalance({
          address: selectedInternalAccountAddress,
          providerId,
        });

        DevLogger.log('usePredictBalance: Loaded balance', {
          balance: balanceData,
          providerId,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load balance';
        setError(errorMessage);
        DevLogger.log('usePredictBalance: Error loading balance', err);

        // Capture exception with balance loading context (no user address)
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: {
            component: 'usePredictBalance',
            action: 'balance_load',
            operation: 'data_fetching',
          },
          extra: {
            balanceContext: {
              providerId,
            },
          },
        });
      } finally {
        isLoadingRef.current = false;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [getBalance, selectedInternalAccountAddress, providerId],
  );

  // Load balance on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadBalance();
    }
  }, [loadOnMount, loadBalance]);

  // Refresh balance when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        // Refresh balance data when returning to this screen
        // Use refresh mode to avoid showing loading spinner
        loadBalance({ isRefresh: true });
      }
    }, [refreshOnFocus, loadBalance]),
  );

  // Reset and reload data when address changes (but not on initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    setError(null);
    loadBalance();
  }, [selectedInternalAccountAddress, loadBalance]);

  return {
    balance,
    hasNoBalance,
    isLoading,
    isRefreshing,
    error,
    loadBalance,
  };
}
