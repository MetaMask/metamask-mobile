import { useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { predictQueries } from '../queries';
import type { PredictMarket } from '../types';
import { ensureError } from '../utils/predictErrorHandler';

export interface UseFeaturedCarouselDataResult {
  markets: PredictMarket[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFeaturedCarouselData = (): UseFeaturedCarouselDataResult => {
  const query = useQuery(predictQueries.featuredCarousel.options());

  useEffect(() => {
    if (!query.error) return;

    Logger.error(ensureError(query.error), {
      tags: {
        feature: PREDICT_CONSTANTS.FEATURE_NAME,
        component: 'useFeaturedCarouselData',
      },
      context: {
        name: 'useFeaturedCarouselData',
        data: {
          method: 'queryFn',
          action: 'featured_carousel_load',
          operation: 'data_fetching',
        },
      },
    });
  }, [query.error]);

  const refetch = useCallback(async () => {
    await query.refetch();
  }, [query]);

  return {
    markets: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch,
  };
};
