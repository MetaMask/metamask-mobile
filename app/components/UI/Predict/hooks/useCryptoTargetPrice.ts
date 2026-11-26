import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import type { CryptoTargetPriceQueryParams } from '../queries/cryptoTargetPrice';
import { isMetalSymbol } from '../utils/cryptoUpDown';

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
    // Metals have no crypto-price endpoint; callers fall back to Gamma's
    // `priceToBeat` through `resolveCryptoTargetPrice`.
    enabled: enabled && !!eventId && !isMetalSymbol(symbol),
  });
