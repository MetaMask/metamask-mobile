import { useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  type UseInfiniteQueryResult,
} from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import type { PredictActivity } from '../types';
import { PREDICT_ACTIVITY_PAGE_SIZE } from '../constants/transactions';
import { usePredictNetworkManagement } from './usePredictNetworkManagement';
import { getEvmAccountFromSelectedAccountGroup } from '../utils/accounts';
import { predictQueries } from '../queries';
import { selectSelectedAccountGroupId } from '../../../../selectors/multichainAccounts/accountTreeController';
import { ensureError } from '../utils/predictErrorHandler';

export interface UsePredictActivityOptions {
  limit?: number;
}

export interface UsePredictActivityResult
  extends Omit<UseInfiniteQueryResult<PredictActivity[], Error>, 'data'> {
  activity: PredictActivity[];
  data: PredictActivity[];
}

export function usePredictActivity({
  limit = PREDICT_ACTIVITY_PAGE_SIZE,
}: UsePredictActivityOptions = {}): UsePredictActivityResult {
  type PredictActivityQueryKey = ReturnType<
    typeof predictQueries.activity.keys.byAddress
  >;

  const { ensurePolygonNetworkExists } = usePredictNetworkManagement();
  // Subscribe to account group changes so the hook re-renders when the user switches accounts
  useSelector(selectSelectedAccountGroupId);
  const evmAccount = getEvmAccountFromSelectedAccountGroup();
  const address = evmAccount?.address;

  useEffect(() => {
    ensurePolygonNetworkExists().catch(() => undefined);
  }, [ensurePolygonNetworkExists]);

  const queryResult = useInfiniteQuery<
    PredictActivity[],
    Error,
    PredictActivity[],
    PredictActivityQueryKey
  >({
    ...predictQueries.activity.options({ address: address ?? '', limit }),
    enabled: Boolean(address),
  });

  const activity = useMemo(() => {
    const seenActivityIds = new Set<string>();

    return (
      queryResult.data?.pages.flatMap((page) =>
        page.filter((activityItem) => {
          if (seenActivityIds.has(activityItem.id)) {
            return false;
          }

          seenActivityIds.add(activityItem.id);
          return true;
        }),
      ) ?? []
    );
  }, [queryResult.data]);

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
          limit,
        },
      },
    });
  }, [limit, queryResult.error]);

  return {
    ...queryResult,
    activity,
    data: activity,
  };
}
