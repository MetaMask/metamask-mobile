import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { predictQueries } from '../queries';

/**
 * Hook to fetch detailed Predict market information.
 *
 * Backed by React Query — results are cached, deduplicated, and
 * automatically revalidated on stale-while-revalidate semantics.
 */
export const usePredictMarket = ({
  id,
  enabled = true,
}: {
  id: string;
  enabled?: boolean;
}) => {
  const queryResult = useQuery({
    ...predictQueries.market.options({ marketId: id }),
    enabled: enabled && !!id,
  });

  useEffect(() => {
    if (!queryResult.error) return;

    Logger.error(ensureError(queryResult.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictMarket',
      },
      context: {
        name: 'usePredictMarket',
        data: {
          method: 'queryFn',
          action: 'market_load',
          operation: 'data_fetching',
          marketId: id,
        },
      },
    });
  }, [queryResult.error, id]);

  return queryResult;
};
