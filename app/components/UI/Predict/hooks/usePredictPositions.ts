import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { GetAllPositionsResult, PredictPosition } from '../types';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

const OPTIMISTIC_POLL_INTERVAL = 2_000;

interface UsePredictPositionsOptions {
  enabled?: boolean;
  refreshOnFocus?: boolean;
  claimable?: boolean;
  marketId?: string;
  autoRefreshTimeout?: number;
}

interface UsePredictPositionsReturn {
  positions: PredictPosition[];
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function usePredictPositions(
  options: UsePredictPositionsOptions = {},
): UsePredictPositionsReturn {
  const {
    enabled = true,
    refreshOnFocus = true,
    claimable,
    marketId,
    autoRefreshTimeout,
  } = options;

  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    ensurePolygonNetworkExists().catch(() => undefined);
  }, [enabled, ensurePolygonNetworkExists]);

  const queryOpts = predictQueries.positions.options({ address });

  const cachedData = queryClient.getQueryData<GetAllPositionsResult>(
    queryOpts.queryKey,
  );
  const hasOptimistic = (cachedData?.activePositions ?? []).some(
    (p) => p.optimistic,
  );

  const query = useQuery({
    ...queryOpts,
    enabled,
    refetchInterval: hasOptimistic
      ? OPTIMISTIC_POLL_INTERVAL
      : (autoRefreshTimeout ?? false),
  });

  useFocusEffect(
    useCallback(() => {
      if (refreshOnFocus && enabled) {
        query.refetch();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshOnFocus, enabled]),
  );

  const positions = useMemo(() => {
    const data = query.data;
    if (!data) return [];

    let result: PredictPosition[];
    if (claimable === true) {
      result = data.claimablePositions;
    } else if (claimable === false) {
      result = data.activePositions;
    } else {
      result = [...data.activePositions, ...data.claimablePositions];
    }

    if (marketId) {
      result = result.filter((p) => p.marketId === marketId);
    }

    return result;
  }, [query.data, claimable, marketId]);

  const refetch = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: predictQueries.positions.keys.all(),
    });
  }, [queryClient]);

  return {
    positions,
    isLoading: query.isLoading,
    isRefreshing: query.isRefetching,
    error: query.error?.message ?? null,
    refetch,
  };
}
