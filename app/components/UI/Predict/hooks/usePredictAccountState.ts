import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import type { AccountState } from '../types';

interface UsePredictAccountStateOptions {
  /**
   * Whether the query is enabled.
   * @default true
   */
  enabled?: boolean;
}

/**
 * Fetches the Predict account state (address, deployment status, allowances).
 * Ensures the Polygon network exists before the query runs.
 */
export function usePredictAccountState(
  options: UsePredictAccountStateOptions = {},
): UseQueryResult<AccountState, Error> {
  const { enabled = true } = options;
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();

  useEffect(() => {
    ensurePolygonNetworkExists().catch(() => {
      // Network may already exist — swallow so the query can still proceed.
    });
  }, [ensurePolygonNetworkExists]);

  return useQuery({
    ...predictQueries.accountState.options(),
    enabled,
  });
}
