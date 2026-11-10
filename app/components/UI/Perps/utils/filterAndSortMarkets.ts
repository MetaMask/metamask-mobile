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

const computeFilteredAndSortedMarkets = (
  marketData: PerpsMarketData[],
  showZeroVolume: boolean,
  showZeroOpenInterest: boolean,
): PerpsMarketDataWithVolumeNumber[] => {
  const filteredData = marketData.filter((market) => {
    if (!showZeroVolume && isInvalidMarketMetric(market.volume)) {
      return false;
    }
    if (!showZeroOpenInterest && isInvalidMarketMetric(market.openInterest)) {
      return false;
    }
    return true;
  });

  return filteredData
    .map((item) => ({ ...item, volumeNumber: parseVolume(item.volume) }))
    .sort((a, b) => b.volumeNumber - a.volumeNumber);
};

const resultsByInput = new WeakMap<
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
  const optionsKey = `${showZeroVolume}:${showZeroOpenInterest}`;
  let resultsByOptions = resultsByInput.get(marketData);
  const cachedResult = resultsByOptions?.get(optionsKey);
  if (cachedResult) {
    return cachedResult;
  }

  const result = computeFilteredAndSortedMarkets(
    marketData,
    showZeroVolume,
    showZeroOpenInterest,
  );
  if (!resultsByOptions) {
    resultsByOptions = new Map();
    resultsByInput.set(marketData, resultsByOptions);
  }
  resultsByOptions.set(optionsKey, result);
  return result;
}
