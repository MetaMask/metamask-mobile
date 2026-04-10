import { queryOptions } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { PREDICT_CONSTANTS } from '../constants/errors';
import type { PredictOutcome } from '../types';

const CRYPTO_PRICE_API = 'https://polymarket.com/api/crypto/crypto-price';

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

interface CryptoTargetPriceApiResponse {
  price: number;
}

export interface CryptoTargetPriceApiParams {
  symbol: string;
  eventStartTime: string;
  variant: string;
  endDate: string;
}

async function fetchTargetPriceFromApi(
  params: CryptoTargetPriceApiParams,
): Promise<number> {
  const url = `${CRYPTO_PRICE_API}?symbol=${encodeURIComponent(params.symbol)}&eventStartTime=${encodeURIComponent(params.eventStartTime)}&variant=${encodeURIComponent(params.variant)}&endDate=${encodeURIComponent(params.endDate)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Crypto target price API returned ${response.status}`);
  }

  const data: unknown = await response.json();
  const parsed = data as CryptoTargetPriceApiResponse | undefined;
  if (typeof parsed?.price !== 'number') {
    throw new Error('Crypto target price API returned unexpected shape');
  }
  return parsed.price;
}

function extractThresholdFromOutcomes(
  outcomes: PredictOutcome[],
): number | null {
  if (!outcomes.length) {
    return null;
  }
  // All outcomes in a crypto Up/Down market share the same threshold.
  return outcomes[0].groupItemThreshold ?? null;
}

async function fetchThresholdFromController(
  eventId: string,
): Promise<number | null> {
  try {
    const market = await Engine.context.PredictController.getMarket({
      marketId: eventId,
    });
    if (!market?.outcomes?.length) {
      return null;
    }
    return extractThresholdFromOutcomes(market.outcomes);
  } catch {
    return null;
  }
}

export interface CryptoTargetPriceQueryParams
  extends CryptoTargetPriceApiParams {
  eventId: string;
  outcomes?: PredictOutcome[];
}

export const predictCryptoTargetPriceOptions = ({
  eventId,
  symbol,
  eventStartTime,
  variant,
  endDate,
  outcomes,
}: CryptoTargetPriceQueryParams) =>
  queryOptions<number | null, Error>({
    queryKey: predictCryptoTargetPriceKeys.detail(eventId),
    queryFn: async (): Promise<number | null> => {
      const cached = targetPriceCache.get(eventId);
      if (cached !== undefined) {
        return cached;
      }

      try {
        const price = await fetchTargetPriceFromApi({
          symbol,
          eventStartTime,
          variant,
          endDate,
        });
        targetPriceCache.set(eventId, price);
        return price;
      } catch (apiError) {
        // Warning (not error) — undocumented endpoint; breadcrumbs detect breakage without Sentry alerts.
        Logger.log(
          `[${PREDICT_CONSTANTS.FEATURE_NAME}] Crypto target price API failed for event ${eventId}, falling back to groupItemThreshold`,
          apiError,
        );
      }

      const fallbackPrice = outcomes
        ? extractThresholdFromOutcomes(outcomes)
        : await fetchThresholdFromController(eventId);

      if (fallbackPrice !== null) {
        targetPriceCache.set(eventId, fallbackPrice);
      }
      return fallbackPrice;
    },

    staleTime: Infinity,
  });
