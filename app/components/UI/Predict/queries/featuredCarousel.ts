import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { PredictMarket } from '../types';

/**
 * Query key factory for Predict featured carousel queries.
 *
 * - `all()` — prefix key for invalidating every carousel entry at once.
 */
export const predictFeaturedCarouselKeys = {
  all: () => ['predict', 'featuredCarousel'] as const,
};

export const predictFeaturedCarouselOptions = () =>
  queryOptions<PredictMarket[], Error>({
    queryKey: predictFeaturedCarouselKeys.all(),
    queryFn: async (): Promise<PredictMarket[]> => {
      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('PredictController not available');
      }
      return controller.getCarouselMarkets();
    },
    staleTime: 10_000,
  });
