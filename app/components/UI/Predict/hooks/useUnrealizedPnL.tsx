import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { UnrealizedPnL } from '../types';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { usePredictPositions } from './usePredictPositions';

export interface UseUnrealizedPnLOptions {
  /**
   * The address to fetch unrealized P&L for
   */
  address?: string;
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
  loadUnrealizedPnL: () => Promise<void>;
}

/**
 * Hook for managing unrealized P&L data with loading states
 * @param options Configuration options for the hook
 * @returns Unrealized P&L data and loading utilities
 */
export const useUnrealizedPnL = (
  options: UseUnrealizedPnLOptions = {},
): UseUnrealizedPnLResult => {
  const { address, loadOnMount = true, refreshOnFocus = true } = options;

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const selectedInternalAccountAddress = evmAccount?.address ?? '0x0';
  const resolvedAddress = address ?? selectedInternalAccountAddress;

  const queryClient = useQueryClient();

  const { data: activePositions } = usePredictPositions({ claimable: false });
  const hasPositions = (activePositions?.length ?? 0) > 0;

  const queryOpts = useMemo(
    () => predictQueries.unrealizedPnL.options({ address: resolvedAddress }),
    [resolvedAddress],
  );

  const query = useQuery({
    ...queryOpts,
    enabled: loadOnMount,
  });

  useEffect(() => {
    if (!query.error) return;

    Logger.error(ensureError(query.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'useUnrealizedPnL',
      },
      context: {
        name: 'useUnrealizedPnL',
        data: {
          method: 'loadUnrealizedPnL',
          action: 'unrealized_pnl_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [query.error]);

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus) {
        queryClient.invalidateQueries({ queryKey: queryOpts.queryKey });
      }
    }, [refreshOnFocus, queryClient, queryOpts.queryKey]),
  );

  const loadUnrealizedPnL = useCallback(async () => {
    try {
      await queryClient.fetchQuery({ ...queryOpts, staleTime: 0 });
    } catch {
      // Error is tracked via query.error and logged by the useEffect above
    }
  }, [queryClient, queryOpts]);

  const unrealizedPnL = useMemo(
    () => (hasPositions ? (query.data ?? null) : null),
    [hasPositions, query.data],
  );

  const error = useMemo(() => {
    if (!query.error) return null;
    return query.error instanceof Error
      ? query.error.message
      : 'Failed to fetch unrealized P&L';
  }, [query.error]);

  return {
    unrealizedPnL,
    isLoading: query.isLoading,
    isRefreshing: query.isFetching && !query.isLoading,
    error,
    loadUnrealizedPnL,
  };
};
