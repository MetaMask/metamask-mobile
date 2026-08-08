import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { predictQueries } from '../queries';
import { predictMarketKeys } from '../queries/market';
import type { GetSeriesParams } from '../types';

interface UsePredictSeriesOptions {
  enabled?: boolean;
}

export const usePredictSeries = (
  params: GetSeriesParams,
  options: UsePredictSeriesOptions = {},
) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    ...predictQueries.series.options(params),
    enabled: options.enabled ?? true,
  });

  useEffect(() => {
    if (!query.data) return;

    query.data.forEach((event) => {
      queryClient.setQueryData(predictMarketKeys.detail(event.id), event);
    });
  }, [query.data, queryClient]);

  useEffect(() => {
    if (!query.error || options.enabled === false) return;

    Logger.error(ensureError(query.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'usePredictSeries',
      },
      context: {
        name: 'usePredictSeries',
        data: {
          method: 'queryFn',
          action: 'series_load',
          operation: 'data_fetching',
          seriesId: params.seriesId,
        },
      },
    });
  }, [query.error, options.enabled, params.seriesId]);

  return query;
};
