import {
  PERPS_CONSTANTS,
  parseVolume,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../hooks/usePerpsMarkets';

const isInvalidMarketMetric = (metric: string | undefined): boolean =>
  !metric ||
  metric === PERPS_CONSTANTS.FallbackPriceDisplay ||
  metric === PERPS_CONSTANTS.FallbackDataDisplay ||
  metric === PERPS_CONSTANTS.ZeroAmountDisplay ||
  metric === PERPS_CONSTANTS.ZeroAmountDetailedDisplay ||
  parseVolume(metric) <= 0;

// A dozen `usePerpsMarkets` call sites each run this over the same ~280-market
// snapshot in their mount-time `useState` initializer, so several instances
// repeat identical work — and identical allocation — on a single tick. Keyed on
// the snapshot itself: a new snapshot gets a fresh entry and the old one is
// collected with it. Safe only while no caller mutates the result in place;
// today every consumer copies first (the controller's `sortMarkets` does
// `[...markets]`).
const resultCache = new WeakMap<
  PerpsMarketData[],
  Map<string, PerpsMarketDataWithVolumeNumber[]>
>();

/**
 * Filter out zero/invalid market metrics and sort by volume descending.
 */
export function filterAndSortMarkets({
  marketData,
  showZeroVolume,
  showZeroOpenInterest = showZeroVolume,
}: {
  marketData: PerpsMarketData[];
  showZeroVolume: boolean;
  showZeroOpenInterest?: boolean;
}): PerpsMarketDataWithVolumeNumber[] {
  const cacheKey = `${showZeroVolume}:${showZeroOpenInterest}`;
  const cachedByFlags = resultCache.get(marketData);
  const cached = cachedByFlags?.get(cacheKey);
  if (cached) {
    return cached;
  }

  const filteredData = marketData.filter((market) => {
    if (!showZeroVolume && isInvalidMarketMetric(market.volume)) {
      return false;
    }
    if (!showZeroOpenInterest && isInvalidMarketMetric(market.openInterest)) {
      return false;
    }
    return true;
  });

  const result = filteredData
    .map((item) => ({ ...item, volumeNumber: parseVolume(item.volume) }))
    .sort((a, b) => b.volumeNumber - a.volumeNumber);

  if (cachedByFlags) {
    cachedByFlags.set(cacheKey, result);
  } else {
    resultCache.set(marketData, new Map([[cacheKey, result]]));
  }

  return result;
}
