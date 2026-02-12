import { useEffect } from 'react';
import {
  useQuery,
  type RefetchOptions,
  type QueryObserverResult,
} from '@tanstack/react-query';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';

interface UsePredictBalanceOptions {
  providerId?: string;
  enabled?: boolean;
  // TODO: Remove once confirmations code migrates to `data` from useQuery.
  loadOnMount?: boolean;
}

type Refetch = (
  options?: RefetchOptions,
) => Promise<QueryObserverResult<number, Error>>;

interface UsePredictBalanceResult {
  data?: number;
  isLoading: boolean;
  isFetching?: boolean;
  error: Error | null;
  refetch?: Refetch;
  // TODO: Remove legacy fields once confirmations code migrates to `data`.
  balance: number;
  hasNoBalance: boolean;
  isRefreshing: boolean;
  loadBalance: Refetch;
}

export function usePredictBalance(
  options?: UsePredictBalanceOptions,
): UsePredictBalanceResult {
  const { providerId = POLYMARKET_PROVIDER_ID, enabled = true } = options ?? {};

  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  useEffect(() => {
    if (!enabled) return;
    ensurePolygonNetworkExists().catch(() => {
      // Network may already exist — swallow so the query can still proceed.
    });
  }, [enabled, ensurePolygonNetworkExists]);

  const query = useQuery({
    ...predictQueries.balance.options({ address, providerId }),
    enabled,
  });

  const balance = query.data ?? 0;

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error,
    refetch: query.refetch,
    // TODO: Remove legacy fields once confirmations code migrates to `data`.
    balance,
    hasNoBalance: !query.isLoading && balance === 0,
    isRefreshing: query.isRefetching,
    loadBalance: query.refetch,
  };
}
