import { useEffect, useRef } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { predictQueries } from '../queries';
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
 */
export function usePredictAccountState(
  options: UsePredictAccountStateOptions = {},
): UseQueryResult<AccountState, Error> {
  const { enabled = true } = options;

  const queryResult = useQuery({
    ...predictQueries.accountState.options(),
    enabled,
  });

  const reportedErrorRef = useRef<Error | null>(null);

  useEffect(() => {
    if (!queryResult.error) {
      reportedErrorRef.current = null;
      return;
    }

    if (reportedErrorRef.current === queryResult.error) return;
    reportedErrorRef.current = queryResult.error;

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
