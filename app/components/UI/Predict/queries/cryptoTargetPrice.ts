import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { GetCryptoTargetPriceParams } from '../types';

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
  queryOptions<number, Error>({
    queryKey: predictCryptoTargetPriceKeys.detail(eventId),
    queryFn: async (): Promise<number> => {
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
        return price;
      }

      throw new Error(`Crypto target price unavailable for event ${eventId}`);
    },

    staleTime: Infinity,
    cacheTime: Infinity,
  });
