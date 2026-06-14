import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import type { GetCryptoTargetPriceParams } from '../types';

export const predictCryptoTargetPriceKeys = {
  all: () => ['predict', 'cryptoTargetPrice'] as const,
  detail: (
    eventId: string,
    symbol: string,
    eventStartTime: string,
    variant: string,
    endDate: string,
  ) =>
    [
      ...predictCryptoTargetPriceKeys.all(),
      eventId,
      symbol,
      eventStartTime,
      variant,
      endDate,
    ] as const,
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
    queryKey: predictCryptoTargetPriceKeys.detail(
      eventId,
      symbol,
      eventStartTime,
      variant,
      endDate,
    ),
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
