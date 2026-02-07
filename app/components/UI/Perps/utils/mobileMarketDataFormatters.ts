/**
 * Mobile-specific market data formatters.
 *
 * Wraps the portable transformMarketData with mobile formatter injection
 * so callers don't need to pass formatters explicitly.
 */
import type {
  PerpsMarketData,
  MarketType,
  MarketDataFormatters,
} from '@metamask/perps-controller/types';
import {
  calculateOpenInterestUSD,
  transformMarketData as transformMarketDataPortable,
  formatChange as formatChangePortable,
  type HyperLiquidMarketData,
} from '@metamask/perps-controller/utils/marketDataTransform';
import {
  formatVolume,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from './formatUtils';
import { getIntlNumberFormatter } from '../../../../util/intl';

// Re-export pure functions unchanged
export { calculateOpenInterestUSD, type HyperLiquidMarketData };

/**
 * Mobile-specific formatters that wire up the platform dependencies.
 */
const mobileFormatters: MarketDataFormatters = {
  formatVolume,
  formatPerpsFiat,
  formatPercentage: (percent: number): string => {
    if (isNaN(percent) || !isFinite(percent)) return '0.00%';
    if (percent === 0) return '0.00%';

    const formatted = getIntlNumberFormatter('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(percent / 100);

    return percent > 0 ? `+${formatted}` : formatted;
  },
  priceRangesUniversal: PRICE_RANGES_UNIVERSAL,
};

/**
 * Transform raw HyperLiquid market data to UI-friendly format.
 * Injects mobile formatters automatically.
 */
export function transformMarketData(
  hyperLiquidData: HyperLiquidMarketData,
  assetMarketTypes?: Record<string, MarketType>,
): PerpsMarketData[] {
  return transformMarketDataPortable(
    hyperLiquidData,
    mobileFormatters,
    assetMarketTypes,
  );
}

/**
 * Format 24h change with sign.
 * Injects mobile formatters automatically.
 */
export function formatChange(change: number): string {
  return formatChangePortable(change, mobileFormatters);
}

/**
 * Format percentage change with sign.
 */
export function formatPercentage(percent: number): string {
  return mobileFormatters.formatPercentage(percent);
}
