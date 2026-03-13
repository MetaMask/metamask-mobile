import { useEffect } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import type { PredictActivity } from '../types';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { ensureError } from '../utils/predictErrorHandler';

export function usePredictActivity(): UseQueryResult<PredictActivity[], Error> {
  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address ?? '0x0';

  useEffect(() => {
    ensurePolygonNetworkExists().catch(() => undefined);
  }, [ensurePolygonNetworkExists]);

  const queryResult = useQuery(predictQueries.activity.options({ address }));

  useEffect(() => {
    if (!queryResult.error) return;

    Logger.error(ensureError(queryResult.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictActivity',
      },
      context: {
        name: 'usePredictActivity',
        data: {
          method: 'queryFn',
          action: 'activity_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [queryResult.error]);

  return queryResult;
}
