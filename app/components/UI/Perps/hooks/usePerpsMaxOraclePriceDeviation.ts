import { usePerpsProvider } from './usePerpsProvider';
import type { PerpsProviderType } from '@metamask/perps-controller';

/**
 * The venue's limit-price deviation band for one market: the furthest a limit
 * price may sit from its oracle price, as a fraction (0.95 = 95%).
 *
 * The limit is reported per market by the market's provider
 * (`PerpsOrderLimits.maxOraclePriceDeviation`). A venue that omits it — Lighter
 * today — gets no band check: clients must not fall back to another venue's
 * value (Core `docs/client-contract.md`).
 *
 * @param symbol - Market to read the limit for; `undefined` while no market is
 * selected, which also yields `undefined`.
 * @returns The band fraction, or `undefined` when the venue omits it, the
 * capabilities are still loading, or the market is unavailable.
 */
export function usePerpsMaxOraclePriceDeviation(
  symbol: string | undefined,
  providerId?: PerpsProviderType,
): number | undefined {
  const { orderCapabilities } = usePerpsProvider(
    symbol ? { symbol, providerId } : undefined,
  );
  return orderCapabilities?.status === 'ready'
    ? orderCapabilities.orderLimits?.maxOraclePriceDeviation
    : undefined;
}
