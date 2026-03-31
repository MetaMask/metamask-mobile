import { useCallback, useEffect, useState } from 'react';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PredictMarket } from '../types';

export interface UseFeaturedCarouselDataResult {
  markets: PredictMarket[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useFeaturedCarouselData = (): UseFeaturedCarouselDataResult => {
  const [markets, setMarkets] = useState<PredictMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const controller = Engine.context.PredictController;
      if (!controller) {
        throw new Error('PredictController not available');
      }

      const result = await controller.getCarouselMarkets();
      setMarkets(result);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : 'Failed to fetch carousel';
      setError(message);
      Logger.error(e instanceof Error ? e : new Error(message));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    markets,
    isLoading,
    error,
    refetch: fetchData,
  };
};
