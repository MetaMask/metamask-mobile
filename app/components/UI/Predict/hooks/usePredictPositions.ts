import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PredictPosition } from '../types';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

const OPTIMISTIC_POLL_INTERVAL = 2_000;

interface UsePredictPositionsOptions {
  enabled?: boolean;
  refetchInterval?: number | false;
  claimable?: boolean;
  marketId?: string;
}

function buildSelect(claimable?: boolean, marketId?: string) {
  return (data: PredictPosition[]) => {
    let result = data;

    if (claimable === true) {
      result = result.filter((p) => p.claimable);
    } else if (claimable === false) {
      result = result.filter((p) => !p.claimable);
    }

    if (marketId) {
      result = result.filter((p) => p.marketId === marketId);
    }

    return result;
  };
}

export function usePredictPositions(options: UsePredictPositionsOptions = {}) {
  const { enabled = true, refetchInterval, claimable, marketId } = options;

  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;
    ensurePolygonNetworkExists().catch(() => undefined);
  }, [enabled, ensurePolygonNetworkExists]);

  const queryOpts = predictQueries.positions.options({ address });

  const cachedData = queryClient.getQueryData<PredictPosition[]>(
    queryOpts.queryKey,
  );
  const hasOptimistic = (cachedData ?? []).some(
    (p: PredictPosition) => p.optimistic,
  );

  return useQuery({
    ...queryOpts,
    enabled,
    refetchInterval: hasOptimistic
      ? OPTIMISTIC_POLL_INTERVAL
      : (refetchInterval ?? false),
    select: buildSelect(claimable, marketId),
  });
}
