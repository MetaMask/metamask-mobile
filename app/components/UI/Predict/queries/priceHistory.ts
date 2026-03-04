import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import {
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';

export const predictPriceHistoryKeys = {
  all: () => ['predict', 'priceHistory'] as const,
  detail: (
    marketId: string,
    interval: PredictPriceHistoryInterval,
    fidelity?: number,
    startTs?: number,
    endTs?: number,
  ) =>
    [
      ...predictPriceHistoryKeys.all(),
      marketId,
      interval,
      fidelity,
      startTs,
      endTs,
    ] as const,
};

export const predictPriceHistoryOptions = ({
  marketId,
  interval = PredictPriceHistoryInterval.ONE_DAY,
  fidelity,
  startTs,
  endTs,
}: {
  marketId: string;
  interval?: PredictPriceHistoryInterval;
  fidelity?: number;
  startTs?: number;
  endTs?: number;
}) =>
  queryOptions({
    queryKey: predictPriceHistoryKeys.detail(
      marketId,
      interval,
      fidelity,
      startTs,
      endTs,
    ),
    queryFn: async (): Promise<PredictPriceHistoryPoint[]> => {
      const history = await Engine.context.PredictController.getPriceHistory({
        marketId,
        fidelity,
        interval,
        startTs,
        endTs,
      });
      return history ?? [];
    },
    staleTime: 5_000,
  });
