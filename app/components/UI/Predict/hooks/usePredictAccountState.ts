import { useCallback, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { predictQueries } from '../queries';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';

interface UsePredictWalletParams {
  /**
   * Whether to load account state on mount
   * @default true
   */
  loadOnMount?: boolean;
}

export const usePredictAccountState = ({
  loadOnMount = true,
}: UsePredictWalletParams = {}) => {
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
  const queryClient = useQueryClient();
  const [isEnabled, setIsEnabled] = useState(loadOnMount);

  useEffect(() => {
    ensurePolygonNetworkExists().catch((networkError: unknown) => {
      DevLogger.log(
        'usePredictAccountState: Failed to ensure Polygon network exists',
        networkError,
      );
    });
  }, [ensurePolygonNetworkExists]);

  const query = useQuery({
    ...predictQueries.accountState.options(),
    enabled: isEnabled,
  });

  const address = query.data?.address;
  const isDeployed = !!query.data?.isDeployed;
  const hasAllowances = !!query.data?.hasAllowances;

  const isLoading = query.isLoading;
  const isRefreshing = query.isFetching && !query.isLoading;

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : 'Failed to load account state'
    : null;

  const loadAccountState = useCallback(async () => {
    setIsEnabled(true);
    try {
      await queryClient.fetchQuery({
        ...predictQueries.accountState.options(),
        staleTime: 0,
      });
    } catch {
      // Error is captured by the useQuery observer and exposed via query.error
    }
  }, [queryClient]);

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
