import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import { predictQueries } from '../queries';
import { predictMarketKeys } from '../queries/market';
import type { GetSeriesParams } from '../types';
import Engine from '../../../../core/Engine';

export const usePredictSeries = (params: GetSeriesParams) => {
  const queryClient = useQueryClient();

  const query = useQuery({
    ...predictQueries.series.options(params),
    queryFn: async () => {
      const controller = Engine.context.PredictController;
      const events = await controller.getMarketSeries(params);

      events.forEach((event) => {
        queryClient.setQueryData(predictMarketKeys.detail(event.id), event);
      });

      return events;
    },
  });

  useEffect(() => {
    if (!query.error) return;

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
  }, [query.error, params.seriesId]);

  return query;
};
