import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
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
      try {
        const history = await Engine.context.PredictController.getPriceHistory({
          marketId,
          fidelity,
          interval,
          startTs,
          endTs,
        });
        return history ?? [];
      } catch (err) {
        DevLogger.log(
          `usePredictPriceHistory: Error fetching price history for market ${marketId}`,
          err,
        );

        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictPriceHistory',
          },
          context: {
            name: 'usePredictPriceHistory',
            data: {
              method: 'loadPriceHistory',
              action: 'price_history_load_single',
              operation: 'data_fetching',
              marketId,
              interval,
              startTs,
              endTs,
              fidelity,
            },
          },
        });

        throw err;
      }
    },
    staleTime: 5_000,
  });
