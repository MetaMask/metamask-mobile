import type {
  AllMidsResponse,
  PerpsUniverse,
  PerpsAssetCtx,
  PredictedFunding,
} from '../types/hyperliquid-types';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';
import { HYPERLIQUID_CONFIG } from '../constants/hyperLiquidConfig';
import type { PerpsMarketData, MarketType } from '../controllers/types';
import {
  formatVolume,
  formatPerpsFiat,
  PRICE_RANGES_UNIVERSAL,
} from './formatUtils';
import { getIntlNumberFormatter } from '../../../../util/intl';
import { parseAssetName } from './hyperLiquidAdapter';

/**
 * Calculate open interest in USD
 * Open interest from HyperLiquid is in contracts/units, not USD
 * To get USD value, multiply by current price
 *
 * @param openInterest - Raw open interest value in contracts/units
 * @param currentPrice - Current price of the asset
 * @returns Open interest in USD, or NaN if invalid
 */
export function calculateOpenInterestUSD(
  openInterest: string | number | undefined,
  currentPrice: string | number | undefined,
): number {
  if (openInterest == null || currentPrice == null) {
    return NaN;
  }

  const openInterestNum =
    typeof openInterest === 'string' ? parseFloat(openInterest) : openInterest;
  const priceNum =
    typeof currentPrice === 'string' ? parseFloat(currentPrice) : currentPrice;

  if (isNaN(openInterestNum) || isNaN(priceNum)) {
    return NaN;
  }

  return openInterestNum * priceNum;
}

/**
 * HyperLiquid-specific market data structure
 */
export interface HyperLiquidMarketData {
  universe: PerpsUniverse[];
  assetCtxs: PerpsAssetCtx[];
  allMids: AllMidsResponse;
  predictedFundings?: PredictedFunding[];
}

/**
 * Parameters for calculating 24h percentage change
 */
interface CalculateChange24hPercentParams {
  hasCurrentPrice: boolean;
  currentPrice: number;
  prevDayPrice: number;
}

/**
 * Calculate 24h percentage change
 * Shows -100% when current price is missing but previous price exists
 */
function calculateChange24hPercent(
  params: CalculateChange24hPercentParams,
): number {
  const { hasCurrentPrice, currentPrice, prevDayPrice } = params;

  if (!hasCurrentPrice) {
    return prevDayPrice > 0 ? -100 : 0;
  }

  if (prevDayPrice <= 0) {
    return 0;
  }

  return ((currentPrice - prevDayPrice) / prevDayPrice) * 100;
}

/**
 * Funding data extracted from predicted fundings
 */
interface FundingData {
  nextFundingTime?: number;
  fundingIntervalHours?: number;
  predictedFundingRate?: number;
}

/**
 * Parameters for extracting funding data
 */
interface ExtractFundingDataParams {
  predictedFundings?: PredictedFunding[];
  symbol: string;
  exchangeName?: string;
}

/**
 * Extract funding data for a symbol from predicted fundings
 * Looks for specified exchange first, falls back to first available
 *
 * @param params.predictedFundings - Array of predicted funding data
 * @param params.symbol - Asset symbol to extract funding for
 * @param params.exchangeName - Exchange to prioritize (defaults to HyperLiquid's 'HlPerp')
 */
function extractFundingData(params: ExtractFundingDataParams): FundingData {
  const {
    predictedFundings,
    symbol,
    exchangeName = HYPERLIQUID_CONFIG.EXCHANGE_NAME,
  } = params;

  const result: FundingData = {};

  if (!predictedFundings) {
    return result;
  }

  const fundingData = predictedFundings.find(
    ([assetSymbol]) => assetSymbol === symbol,
  );

  if (
    !fundingData?.[1] ||
    !Array.isArray(fundingData[1]) ||
    fundingData[1].length === 0
  ) {
    return result;
  }

  // Look for specified exchange (e.g., 'HlPerp' for HyperLiquid)
  const targetExchange = fundingData[1].find(
    (exchange: unknown) =>
      Array.isArray(exchange) && exchange[0] === exchangeName,
  );

  if (targetExchange?.[1]) {
    result.nextFundingTime = targetExchange[1].nextFundingTime;
    result.fundingIntervalHours = targetExchange[1].fundingIntervalHours;
    result.predictedFundingRate = parseFloat(targetExchange[1].fundingRate);
    return result;
  }

  // Fallback to first exchange if target not found
  const firstExchange = fundingData[1][0];
  if (Array.isArray(firstExchange) && firstExchange[1]) {
    result.nextFundingTime = firstExchange[1].nextFundingTime;
    result.fundingIntervalHours = firstExchange[1].fundingIntervalHours;
  }

  return result;
}

/**
 * Transform raw HyperLiquid market data to UI-friendly format
 * @param hyperLiquidData - Raw data from HyperLiquid API
 * @returns Transformed market data ready for UI consumption
 */
export function transformMarketData(
  hyperLiquidData: HyperLiquidMarketData,
  assetMarketTypes?: Record<string, MarketType>,
): PerpsMarketData[] {
  const { universe, assetCtxs, allMids, predictedFundings } = hyperLiquidData;

  return universe.map((asset, index) => {
    const symbol = asset.name;
    const currentPrice = parseFloat(allMids[symbol]);

    // Find matching asset context for additional data
    // The assetCtxs array is aligned with universe array by index
    const assetCtx = assetCtxs[index];

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
    const change24hPercent = calculateChange24hPercent({
      hasCurrentPrice,
      currentPrice: effectiveCurrentPrice,
      prevDayPrice,
    });

    // Format volume (dayNtlVlm is daily notional volume)
    // If assetCtx is missing or dayNtlVlm is not available, use NaN to indicate missing data
    const volume = assetCtx?.dayNtlVlm ? parseFloat(assetCtx.dayNtlVlm) : NaN;

    // Calculate open interest in USD
    const openInterest = calculateOpenInterestUSD(
      assetCtx?.openInterest,
      currentPrice,
    );

    // Get current funding rate from assetCtx - this is the actual current funding rate
    let fundingRate: number | undefined;

    if (assetCtx && 'funding' in assetCtx) {
      fundingRate = parseFloat(assetCtx.funding);
    }

    // Extract funding timing and predicted rate
    const fundingData = extractFundingData({
      predictedFundings,
      symbol,
    });

    // Use current funding rate from assetCtx, not predicted
    // The predicted rate is for the next funding period
    if (!fundingRate && fundingData.predictedFundingRate !== undefined) {
      fundingRate = fundingData.predictedFundingRate;
    }

    // Extract DEX and base symbol for display
    // e.g., "flx:TSLA" → { dex: "flx", symbol: "TSLA" }
    const { dex } = parseAssetName(symbol);
    const marketSource = dex || undefined;

    // Determine market type:
    // 1. Check explicit mapping (e.g., 'xyz:GOLD' → 'commodity')
    // 2. Default HIP-3 DEX markets to 'equity' (stocks) if not mapped
    // 3. Main DEX markets remain undefined (crypto)
    const marketType: MarketType | undefined =
      assetMarketTypes?.[symbol] || (dex ? 'equity' : undefined);

    return {
      symbol,
      name: symbol,
      maxLeverage: `${asset.maxLeverage}x`,
      price: isNaN(currentPrice)
        ? PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY
        : formatPerpsFiat(currentPrice, { ranges: PRICE_RANGES_UNIVERSAL }),
      change24h: isNaN(change24h)
        ? PERPS_CONSTANTS.ZERO_AMOUNT_DETAILED_DISPLAY
        : formatChange(change24h),
      change24hPercent: isNaN(change24hPercent)
        ? '0.00%'
        : formatPercentage(change24hPercent),
      volume: isNaN(volume)
        ? PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY
        : formatVolume(volume),
      openInterest: isNaN(openInterest)
        ? PERPS_CONSTANTS.FALLBACK_PRICE_DISPLAY
        : formatVolume(openInterest),
      nextFundingTime: fundingData.nextFundingTime,
      fundingIntervalHours: fundingData.fundingIntervalHours,
      fundingRate,
      marketSource,
      marketType,
    };
  });
}

/**
 * Format 24h change with sign
 * Uses more decimal places for smaller amounts to show meaningful precision
 */
export function formatChange(change: number): string {
  if (isNaN(change) || !isFinite(change)) return '$0.00';
  if (change === 0) return '$0.00';

  const formatted = formatPerpsFiat(Math.abs(change), {
    ranges: PRICE_RANGES_UNIVERSAL,
  });

  // Remove $ sign and add it back with proper sign placement
  const valueWithoutDollar = formatted.replace('$', '');
  return change > 0 ? `+$${valueWithoutDollar}` : `-$${valueWithoutDollar}`;
}

/**
 * Format percentage change with sign
 */
export function formatPercentage(percent: number): string {
  if (isNaN(percent) || !isFinite(percent)) return '0.00%';
  if (percent === 0) return '0.00%';

  const formatted = getIntlNumberFormatter('en-US', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(percent / 100);

  return percent > 0 ? `+${formatted}` : formatted;
}
