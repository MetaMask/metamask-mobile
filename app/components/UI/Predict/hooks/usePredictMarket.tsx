import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { predictQueries } from '../queries';

/**
 * Hook to fetch detailed Predict market information
 */
export const usePredictMarket = ({
  id,
  enabled = true,
}: {
  id: string;
  enabled?: boolean;
}) => {
  const query = useQuery({
    ...predictQueries.market.options({ marketId: id }),
    enabled: enabled && !!id,
  });

  useEffect(() => {
    if (!query.error) return;

    Logger.error(ensureError(query.error), {
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
  }, [query.error, id]);

  return query;
};
