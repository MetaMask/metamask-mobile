import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { GetSeriesParams, PredictMarket } from '../types';

export const predictSeriesKeys = {
  all: () => ['predict', 'series'] as const,
  detail: (params: GetSeriesParams) =>
    [
      ...predictSeriesKeys.all(),
      params.seriesId,
      params.endDateMin,
      params.endDateMax,
      params.limit,
    ] as const,
};

export const predictSeriesOptions = (params: GetSeriesParams) =>
  queryOptions<PredictMarket[], Error>({
    queryKey: predictSeriesKeys.detail(params),
    queryFn: async () => {
      const controller = Engine.context.PredictController;
      return controller.getMarketSeries(params);
    },
    staleTime: 10_000,
  });
