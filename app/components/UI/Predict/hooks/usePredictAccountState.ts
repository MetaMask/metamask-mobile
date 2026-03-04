import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
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

  const queryResult = useQuery({
    ...predictQueries.accountState.options({ ensurePolygonNetworkExists }),
    enabled,
  });

  useEffect(() => {
    if (!queryResult.error) return;

    Logger.error(ensureError(queryResult.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictAccountState',
      },
      context: {
        name: 'usePredictAccountState',
        data: {
          method: 'queryFn',
          action: 'account_state_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [queryResult.error]);

  return queryResult;
}
