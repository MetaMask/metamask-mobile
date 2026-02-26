import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { ensureError } from '../utils/predictErrorHandler';
import type { PredictMarket } from '../types';

/**
 * Query key factory for Predict single-market queries.
 *
 * - `all()` — prefix key for invalidating every market entry at once.
 * - `detail(marketId)` — unique key for a specific market.
 */
export const predictMarketKeys = {
  all: () => ['predict', 'market'] as const,
  detail: (marketId: string) => [...predictMarketKeys.all(), marketId] as const,
};

export const predictMarketOptions = ({ marketId }: { marketId: string }) =>
  queryOptions({
    queryKey: predictMarketKeys.detail(marketId),
    queryFn: async (): Promise<PredictMarket | null> => {
      try {
        const controller = Engine.context.PredictController;
        const marketData = await controller.getMarket({ marketId });
        return marketData ?? null;
      } catch (err) {
        Logger.error(ensureError(err), {
          tags: {
            feature: PREDICT_CONSTANTS.FEATURE_NAME,
            component: 'usePredictMarket',
          },
          context: {
            name: 'usePredictMarket',
            data: {
              method: 'loadMarket',
              action: 'market_load',
              operation: 'data_fetching',
              marketId,
            },
          },
        });
        throw ensureError(err);
      }
    },
    staleTime: 10_000,
  });
