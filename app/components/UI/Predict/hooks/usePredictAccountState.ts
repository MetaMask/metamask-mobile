import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { AccountState } from '../providers/types';

interface UsePredictWalletParams {
  /**
   * The provider ID to load account state for
   */
  providerId?: string;
  /**
   * Whether to load account state on mount
   * @default true
   */
  loadOnMount?: boolean;
  /**
   * Whether to refresh account state when screen comes into focus
   * @default true
   */
  refreshOnFocus?: boolean;
}

export const usePredictAccountState = ({
  providerId = 'polymarket',
  loadOnMount = true,
  refreshOnFocus = true,
}: UsePredictWalletParams = {}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountState, setAccountState] = useState<AccountState | null>(null);

  const address = useMemo(() => accountState?.address, [accountState]);
  const isDeployed = useMemo(() => !!accountState?.isDeployed, [accountState]);
  const hasAllowances = useMemo(
    () => !!accountState?.hasAllowances,
    [accountState],
  );

  const loadAccountState = useCallback(
    async (loadOptions?: { isRefresh?: boolean }) => {
      const { isRefresh = false } = loadOptions || {};

      try {
        if (isRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
        setError(null);

        const controller = Engine.context.PredictController;
        const accountStateResponse = await controller.getAccountState({
          providerId,
        });

        setAccountState(accountStateResponse);

        DevLogger.log('usePredictAccountState: Loaded account state', {
          address: accountStateResponse?.address,
          isDeployed: accountStateResponse?.isDeployed,
          hasAllowances: accountStateResponse?.hasAllowances,
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to load account state';
        setError(errorMessage);
        DevLogger.log(
          'usePredictAccountState: Error loading account state',
          err,
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [providerId],
  );

  // Load account state on mount if enabled
  useEffect(() => {
    if (loadOnMount) {
      loadAccountState();
    }
  }, [loadOnMount, loadAccountState]);

  // Refresh account state when screen comes into focus if enabled
  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        // Refresh account state when returning to this screen
        // Use refresh mode to avoid showing loading spinner
        loadAccountState({ isRefresh: true });
      }
    }, [refreshOnFocus, loadAccountState]),
  );

  return {
    address,
    isDeployed,
    hasAllowances,
    isLoading,
    isRefreshing,
    error,
    loadAccountState,
  };
};
