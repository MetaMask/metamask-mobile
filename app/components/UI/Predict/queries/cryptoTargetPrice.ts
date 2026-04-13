import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { GetCryptoTargetPriceParams } from '../types';

/**
 * Module-level cache for immutable target prices.
 * Survives React Query garbage-collection since target prices never change
 * once a crypto Up/Down window opens.
 */
const targetPriceCache = new Map<string, number>();

/** @internal Exposed for tests only. */
export function clearTargetPriceCache(): void {
  targetPriceCache.clear();
}

/** @internal Exposed for tests only. */
export function getTargetPriceCacheSize(): number {
  return targetPriceCache.size;
}

export const predictCryptoTargetPriceKeys = {
  all: () => ['predict', 'cryptoTargetPrice'] as const,
  detail: (eventId: string) =>
    [...predictCryptoTargetPriceKeys.all(), eventId] as const,
};

export interface CryptoTargetPriceQueryParams
  extends GetCryptoTargetPriceParams {
  eventId: string;
}

export const predictCryptoTargetPriceOptions = ({
  eventId,
  symbol,
  eventStartTime,
  variant,
  endDate,
}: CryptoTargetPriceQueryParams) =>
  queryOptions<number | null, Error>({
    queryKey: predictCryptoTargetPriceKeys.detail(eventId),
    queryFn: async (): Promise<number | null> => {
      const cached = targetPriceCache.get(eventId);
      if (cached !== undefined) {
        return cached;
      }

      const price = await Engine.context.PredictController.getCryptoTargetPrice(
        {
          eventId,
          symbol,
          eventStartTime,
          variant,
          endDate,
        },
      );

      if (price !== null) {
        targetPriceCache.set(eventId, price);
      }
      return price;
    },

    staleTime: Infinity,
  });
