import {
  PERPS_CONSTANTS,
  parseVolume,
  type PerpsMarketData,
} from '@metamask/perps-controller';
import type { PerpsMarketDataWithVolumeNumber } from '../hooks/usePerpsMarkets';

/**
 * Filter out zero/invalid volume markets and sort by volume descending.
 */
export function filterAndSortMarkets({
  marketData,
  showZeroVolume,
}: {
  marketData: PerpsMarketData[];
  showZeroVolume: boolean;
}): PerpsMarketDataWithVolumeNumber[] {
  const filteredData = !showZeroVolume
    ? marketData.filter((market) => {
        if (
          market.volume === PERPS_CONSTANTS.FallbackPriceDisplay ||
          market.volume === PERPS_CONSTANTS.FallbackDataDisplay
        ) {
          return false;
        }
        if (
          !market.volume ||
          market.volume === PERPS_CONSTANTS.ZeroAmountDisplay ||
          market.volume === PERPS_CONSTANTS.ZeroAmountDetailedDisplay
        ) {
          return false;
        }
        return true;
      })
    : marketData;

  return filteredData
    .map((item) => ({ ...item, volumeNumber: parseVolume(item.volume) }))
    .sort((a, b) => b.volumeNumber - a.volumeNumber);
}
