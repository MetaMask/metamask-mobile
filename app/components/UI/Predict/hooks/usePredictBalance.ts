import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { captureException } from '@sentry/react-native';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';
import { usePredictTrading } from './usePredictTrading';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';

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
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  const [balance, setBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isInitialMount = useRef(true);
  const isLoadingRef = useRef(false);

  const selectedInternalAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );

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

        // Ensure Polygon network exists before fetching balance
        try {
          await ensurePolygonNetworkExists();
        } catch (networkError) {
          // Error already logged to Sentry in usePredictNetworkManagement
          DevLogger.log(
            'usePredictBalance: Failed to ensure Polygon network exists',
            networkError,
          );
          // Continue with balance fetch - network might already exist
        }

        // Get balance from Predict controller
        const balanceData = await getBalance({
          address: selectedInternalAccountAddress,
          providerId,
        });

        setBalance(balanceData);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getBalance, selectedInternalAccountAddress, providerId],
  );

  // Load balance on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadOnMount]);

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

    setBalance(0);
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
