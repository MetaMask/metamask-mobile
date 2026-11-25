import { usePerpsProvider } from './usePerpsProvider';
import type { PerpsProviderType } from '@metamask/perps-controller';
import { PROVIDER_CONFIG } from '../constants/perpsConfig';

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
 * @param providerId - Venue the order or position belongs to. Without it the
 * active provider is used; in aggregated mode that is unknown, so no band is
 * returned rather than the default venue's.
 * @returns The band fraction, or `undefined` when the venue omits it, the
 * capabilities are still loading, the market is unavailable, or the venue is
 * unknown.
 */
export function usePerpsMaxOraclePriceDeviation(
  symbol: string | undefined,
  providerId?: PerpsProviderType,
): number | undefined {
  const { activeProvider, orderCapabilities } = usePerpsProvider(
    symbol ? { symbol, providerId } : undefined,
  );
  const expectedProviderId =
    providerId ??
    (activeProvider === PROVIDER_CONFIG.AggregatedProvider
      ? undefined
      : activeProvider);
  return orderCapabilities?.status === 'ready' &&
    expectedProviderId !== undefined &&
    orderCapabilities.providerId === expectedProviderId
    ? orderCapabilities.orderLimits?.maxOraclePriceDeviation
    : undefined;
}
