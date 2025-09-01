import type {
  AllMids,
  PerpsAssetCtx,
  PerpsUniverse,
  PredictedFunding,
} from '@deeeed/hyperliquid-node20';
import DevLogger from '../../../../core/SDKConnect/utils/DevLogger';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import type { PerpsMarketData } from '../controllers/types';
import { formatVolume } from './formatUtils';

/**
 * HyperLiquid-specific market data structure
 */
export interface HyperLiquidMarketData {
  universe: PerpsUniverse[];
  assetCtxs: PerpsAssetCtx[];
  allMids: AllMids;
  predictedFundings?: PredictedFunding[];
}

/**
 * Transform raw HyperLiquid market data to UI-friendly format
 * @param hyperLiquidData - Raw data from HyperLiquid API
 * @returns Transformed market data ready for UI consumption
 */
export function transformMarketData(
  hyperLiquidData: HyperLiquidMarketData,
): PerpsMarketData[] {
  DevLogger.log('🔍 transformMarketData called:', {
    hasUniverse: !!hyperLiquidData.universe,
    universeLength: hyperLiquidData.universe?.length || 0,
    hasPredictedFundings: !!hyperLiquidData.predictedFundings,
    predictedFundingsLength: hyperLiquidData.predictedFundings?.length || 0,
    location: 'transformMarketData start',
  });
  const { universe, assetCtxs, allMids, predictedFundings } = hyperLiquidData;

  return universe.map((asset) => {
    const symbol = asset.name;
    const currentPrice = parseFloat(allMids[symbol]);

    // Find matching asset context for additional data
    // Note: assetCtxs array from metaAndAssetCtxs might have different structure
    // The array index should correspond to the universe array index
    const assetCtx = assetCtxs[universe.indexOf(asset)];

    // Calculate 24h change
    const prevDayPrice = assetCtx ? parseFloat(assetCtx.prevDayPx) : 0;

    // Handle missing current price data
    const hasCurrentPrice = !isNaN(currentPrice);
    const effectiveCurrentPrice = hasCurrentPrice ? currentPrice : 0;

    // For dollar change: show $0.00 when current price is missing
    const change24h = hasCurrentPrice
      ? effectiveCurrentPrice - prevDayPrice
      : 0;

    // For percentage: show -100% when current price is missing but previous price exists
    const change24hPercent = hasCurrentPrice
      ? prevDayPrice > 0
        ? ((effectiveCurrentPrice - prevDayPrice) / prevDayPrice) * 100
        : 0
      : prevDayPrice > 0
      ? -100
      : 0;

    // Format volume (dayNtlVlm is daily notional volume)
    // If assetCtx is missing or dayNtlVlm is not available, use NaN to indicate missing data
    const volume = assetCtx?.dayNtlVlm ? parseFloat(assetCtx.dayNtlVlm) : NaN;

    // Get funding rate directly from HyperLiquid's assetCtx (clean, direct data)
    let fundingRate: number | undefined;

    // Debug assetCtx structure to understand the data
    if (symbol === 'ETH' || symbol === 'BTC') {
      DevLogger.log(`FUNDING_DEBUG [DIRECT] ${symbol} assetCtx structure:`, {
        symbol,
        hasAssetCtx: !!assetCtx,
        assetCtxKeys: assetCtx ? Object.keys(assetCtx) : 'N/A',
        fundingField: assetCtx ? (assetCtx as PerpsAssetCtx).funding : 'N/A',
      });
    }

    if (assetCtx && 'funding' in assetCtx) {
      fundingRate = parseFloat(assetCtx.funding);

      if (symbol === 'ETH' || symbol === 'BTC') {
        DevLogger.log(
          `FUNDING_DEBUG [DIRECT] ${symbol} funding from assetCtx:`,
          {
            symbol,
            rawFunding: assetCtx.funding,
            parsedValue: fundingRate,
            asPercentage: (fundingRate * 100).toFixed(6) + '%',
          },
        );
      }
    } else if (symbol === 'ETH' || symbol === 'BTC') {
      DevLogger.log(
        `FUNDING_DEBUG [DIRECT] ${symbol} funding field not found in assetCtx`,
      );
    }

    // For funding timing, use predictedFundings only for nextFundingTime (not funding rate)
    let nextFundingTime: number | undefined;
    let fundingIntervalHours: number | undefined;

    if (predictedFundings) {
      const fundingData = predictedFundings.find(
        ([assetSymbol]) => assetSymbol === symbol,
      );
      if (fundingData?.[1] && fundingData[1].length > 0) {
        // Just get timing info from first exchange
        const firstExchange = fundingData[1][0];
        if (firstExchange?.[1]) {
          nextFundingTime = firstExchange[1].nextFundingTime;
          fundingIntervalHours = firstExchange[1].fundingIntervalHours;
        }
      }
    }

    return {
      symbol,
      name: symbol, // HyperLiquid uses symbol as name
      maxLeverage: `${asset.maxLeverage}x`,
      price: isNaN(currentPrice) ? '$0.00' : formatPrice(currentPrice),
      change24h: isNaN(change24h) ? '$0.00' : formatChange(change24h),
      change24hPercent: isNaN(change24hPercent)
        ? '0.00%'
        : formatPercentage(change24hPercent),
      volume: isNaN(volume)
        ? PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY
        : formatVolume(volume),
      nextFundingTime,
      fundingIntervalHours,
      fundingRate,
    };
  });
}

/**
 * Format price with appropriate decimal places
 */
export function formatPrice(price: number): string {
  if (isNaN(price) || !isFinite(price)) return '$0.00';
  if (price === 0) return '$0.00';

  const absPrice = Math.abs(price);

  if (absPrice >= 1000) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  if (absPrice >= 1) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(price);
  }
  if (absPrice >= 0.01) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(price);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  }).format(price);
}

/**
 * Format 24h change with sign
 * Uses more decimal places for smaller amounts to show meaningful precision
 */
export function formatChange(change: number): string {
  if (isNaN(change) || !isFinite(change)) return '$0.00';
  if (change === 0) return '$0.00';

  // Determine decimal places based on magnitude: smaller amounts need more precision
  const absChange = Math.abs(change);
  const decimalPlaces = absChange >= 1 ? 2 : absChange >= 0.01 ? 4 : 6;

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
  }).format(change);

  return change > 0 ? `+${formatted}` : formatted;
}

/**
 * Format percentage change with sign
 */
export function formatPercentage(percent: number): string {
  if (isNaN(percent) || !isFinite(percent)) return '0.00%';
  if (percent === 0) return '0.00%';

  const formatted = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100);

  return percent > 0 ? `+${formatted}` : formatted;
}
