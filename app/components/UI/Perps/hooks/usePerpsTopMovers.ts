import { useState, useEffect } from 'react';
import Engine from '../../../../core/Engine';
import {
  type PerpsMarketData,
  type SortDirection,
  type GetMarketDataWithPricesParams,
} from '@metamask/perps-controller';
import { usePerpsConnection } from './usePerpsConnection';

const TOP_MOVERS_LIMIT = 8;

export interface UsePerpsTopMoversOptions {
  direction: SortDirection;
}

export interface UsePerpsTopMoversResult {
  data: PerpsMarketData[];
  isLoading: boolean;
}

/**
 * Fetches the top-moving perps markets (gainers or losers) via the controller.
 *
 * Data is sourced from `PerpsController.getMarketDataWithPrices` with
 * `sortBy: 'priceChange'` and the caller-supplied `direction`, returning up
 * to 8 markets already sorted and sliced by the controller — no client-side
 * sort or slice is applied.
 *
 * Re-fetches automatically when `direction` changes or the connection
 * initialises. Errors fail silently: `data` resets to `[]` so the section
 * can hide itself.
 *
 * Consumers must be rendered inside `PerpsConnectionProvider`.
 */
export const usePerpsTopMovers = ({
  direction,
}: UsePerpsTopMoversOptions): UsePerpsTopMoversResult => {
  const [data, setData] = useState<PerpsMarketData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isConnected, isInitialized, isConnecting } = usePerpsConnection();

  useEffect(() => {
    if (!isConnected || !isInitialized || isConnecting) {
      setData([]);
      return;
    }

    let isMounted = true;

    const fetchMovers = async () => {
      const controller = Engine.context.PerpsController;
      if (!controller?.getActiveProviderOrNull()) {
        return;
      }

      setIsLoading(true);
      try {
        const params: GetMarketDataWithPricesParams = {
          sortBy: 'priceChange',
          direction,
          limit: TOP_MOVERS_LIMIT,
        };
        const result = await controller.getMarketDataWithPrices(params);
        if (isMounted) {
          setData(result);
        }
      } catch {
        if (isMounted) {
          setData([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchMovers();

    return () => {
      isMounted = false;
    };
  }, [direction, isConnected, isInitialized, isConnecting]);

  return { data, isLoading };
};
