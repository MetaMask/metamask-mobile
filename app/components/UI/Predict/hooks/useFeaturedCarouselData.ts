import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import { predictQueries } from '../queries';
import { selectPredictUpDownEnabledFlag } from '../selectors/featureFlags';
import type { PredictMarket } from '../types';
import { isCryptoUpDown } from '../utils/cryptoUpDown';
import { ensureError } from '../utils/predictErrorHandler';

export interface UseFeaturedCarouselDataResult {
  markets: PredictMarket[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<unknown>;
}

export const useFeaturedCarouselData = (): UseFeaturedCarouselDataResult => {
  const query = useQuery(predictQueries.featuredCarousel.options());
  const upDownEnabled = useSelector(selectPredictUpDownEnabledFlag);

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

  const markets = useMemo(() => {
    const data = query.data ?? [];
    if (upDownEnabled) {
      return data;
    }
    return data.filter((market) => !isCryptoUpDown(market));
  }, [query.data, upDownEnabled]);

  return {
    markets,
    isLoading: query.isLoading,
    error: query.error?.message ?? null,
    refetch: query.refetch,
  };
};
