import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { AccountState } from '../providers/types';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';

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
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
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

        try {
          await ensurePolygonNetworkExists();
        } catch (networkError) {
          DevLogger.log(
            'usePredictAccountState: Failed to ensure Polygon network exists',
            networkError,
          );
        }

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

        // Capture exception with account state loading context (no user address)
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictAccountState',
          },
          context: {
            name: 'usePredictAccountState',
            data: {
              method: 'loadAccountState',
              action: 'account_state_load',
              operation: 'data_fetching',
              providerId,
            },
          },
        });
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [providerId, ensurePolygonNetworkExists],
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
