import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import type { CryptoTargetPriceQueryParams } from '../queries/cryptoTargetPrice';

export interface UseCryptoTargetPriceParams
  extends CryptoTargetPriceQueryParams {
  enabled?: boolean;
}

export const useCryptoTargetPrice = ({
  eventId,
  symbol,
  eventStartTime,
  variant,
  endDate,
  twapWindowSeconds,
  enabled = true,
}: UseCryptoTargetPriceParams) =>
  useQuery({
    ...predictQueries.cryptoTargetPrice.options({
      eventId,
      symbol,
      eventStartTime,
      variant,
      endDate,
      twapWindowSeconds,
    }),
    enabled: enabled && !!eventId,
  });
