import type { CandleData, CandleStick } from '../types/perps-types';
import type { PerpsMarketData } from '../controllers/types';
import type { BadgeType } from '../components/PerpsBadge/PerpsBadge.types';
import {
  HYPERLIQUID_ASSET_ICONS_BASE_URL,
  HIP3_ASSET_ICONS_BASE_URL,
} from '../constants/hyperLiquidConfig';

/**
 * Extract the display symbol from a full symbol string
 * Strips DEX prefix for HIP-3 markets (e.g., "xyz:XYZ100" -> "XYZ100")
 * Returns the symbol unchanged if no DEX prefix is present
 *
 * @param symbol - Full symbol (e.g., "BTC" or "xyz:XYZ100")
 * @returns Display symbol without DEX prefix (e.g., "BTC" or "XYZ100")
 */
export const getPerpsDisplaySymbol = (symbol: string): string => {
  if (!symbol || typeof symbol !== 'string') {
    return symbol;
  }

  // Check for DEX prefix pattern (dex:symbol)
  const colonIndex = symbol.indexOf(':');
  if (colonIndex > 0 && colonIndex < symbol.length - 1) {
    // Return everything after the colon
    return symbol.substring(colonIndex + 1);
  }

  // No DEX prefix found, return original symbol
  return symbol;
};

/**
 * Extract the DEX identifier from a full symbol string
 * Returns the DEX prefix for HIP-3 markets (e.g., "xyz:XYZ100" -> "xyz")
 * Returns null if no DEX prefix is present (main DEX market)
 *
 * @param symbol - Full symbol (e.g., "BTC" or "xyz:XYZ100")
 * @returns DEX identifier or null if main DEX (e.g., "xyz" or null)
 */
export const getPerpsDexFromSymbol = (symbol: string): string | null => {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }

  // Check for DEX prefix pattern (dex:symbol)
  const colonIndex = symbol.indexOf(':');
  if (colonIndex > 0 && colonIndex < symbol.length - 1) {
    // Return the DEX prefix (everything before the colon)
    return symbol.substring(0, colonIndex);
  }

  // No DEX prefix found, this is a main DEX market
  return null;
};

interface FundingCountdownParams {
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   * Default is 1 hour for HyperLiquid (funding is paid every hour)
   */
  fundingIntervalHours?: number;
}

/**
 * Calculate the time until the next funding period
 * Supports market-specific funding times when provided
 * Falls back to default HyperLiquid 1-hour periods (funding paid every hour)
 */
export const calculateFundingCountdown = (
  params?: FundingCountdownParams,
): string => {
  const now = new Date();
  const nowMs = now.getTime();

  // If we have a specific next funding time, check if it's reasonable for HyperLiquid's hourly funding
  if (params?.nextFundingTime && params.nextFundingTime > nowMs) {
    const msUntilFunding = params.nextFundingTime - nowMs;
    const hoursUntilFunding = msUntilFunding / (1000 * 60 * 60);

    // If API shows >1.1 hours, it's likely incorrect for HyperLiquid's hourly funding
    // Use fallback calculation instead to show time until next hour
    if (hoursUntilFunding <= 1.1) {
      const totalSeconds = Math.floor(msUntilFunding / 1000);

      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Format as HH:MM:SS
      const formattedHours = String(hours).padStart(2, '0');
      const formattedMinutes = String(minutes).padStart(2, '0');
      const formattedSeconds = String(seconds).padStart(2, '0');

      return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
    }
    // If >1.1 hours, fall through to use hourly calculation instead
  }

  // Fall back to default calculation for HyperLiquid (1-hour periods)
  // HyperLiquid pays funding every hour, so next funding is at the next hour
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // Calculate time remaining until next hour (next funding time)
  const minutesUntilNextHour = 59 - utcMinutes;
  const secondsUntilNextHour = 60 - utcSeconds;

  // Handle edge case where seconds equals 60
  const finalSeconds = secondsUntilNextHour === 60 ? 0 : secondsUntilNextHour;
  const finalMinutes =
    secondsUntilNextHour === 60
      ? minutesUntilNextHour + 1
      : minutesUntilNextHour;

  // For HyperLiquid 1-hour funding, hours should always be 0
  // (countdown should never exceed 59:59 since funding happens every hour)
  const finalHours = finalMinutes === 60 ? 1 : 0;
  const adjustedMinutes = finalMinutes === 60 ? 0 : finalMinutes;

  // Format as HH:MM:SS
  const formattedHours = String(finalHours).padStart(2, '0');
  const formattedMinutes = String(adjustedMinutes).padStart(2, '0');
  const formattedSeconds = String(finalSeconds).padStart(2, '0');

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
};

/**
 * Calculate 24h high and low from candlestick data
 */
export const calculate24hHighLow = (
  candleData: CandleData | null,
): { high: number; low: number } => {
  if (!candleData?.candles || candleData.candles.length === 0) {
    return { high: 0, low: 0 };
  }

  // Get candles from last 24 hours
  const now = Date.now();
  const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

  let last24hCandles = candleData.candles.filter(
    (candle: CandleStick) => candle.time >= twentyFourHoursAgo,
  );

  if (last24hCandles.length === 0) {
    // If no 24h data, use all available candles
    last24hCandles = [...candleData.candles];
  }

  const highs = last24hCandles.map((candle: CandleStick) =>
    parseFloat(candle.high),
  );
  const lows = last24hCandles.map((candle: CandleStick) =>
    parseFloat(candle.low),
  );

  return {
    high: Math.max(...highs),
    low: Math.min(...lows),
  };
};

/**
 * Determine badge type for a market based on its metadata
 * Prioritizes explicit marketType over generic experimental badge
 *
 * @param market - Market data object (only needs marketType and marketSource fields)
 * @returns Badge type to display, or undefined for no badge (main DEX)
 *
 * @example Main DEX
 * getMarketBadgeType({ symbol: 'BTC', marketSource: null }) // → undefined
 *
 * @example Mapped HIP-3 DEX
 * getMarketBadgeType({ symbol: 'xyz:XYZ100', marketSource: 'xyz', marketType: 'equity' }) // → 'equity'
 *
 * @example Unmapped HIP-3 DEX
 * getMarketBadgeType({ symbol: 'abc:ABC100', marketSource: 'abc' }) // → 'experimental'
 */
export const getMarketBadgeType = (
  market: Pick<PerpsMarketData, 'marketType' | 'marketSource'>,
): BadgeType | undefined =>
  // Prioritize explicit marketType (e.g., 'equity' for xyz DEX)
  // Fall back to 'experimental' for unmapped HIP-3 DEXs
  // Main DEX markets without marketType show no badge
  market.marketType || (market.marketSource ? 'experimental' : undefined);

/**
 * Generate the appropriate icon URL for an asset symbol
 * Handles both regular assets and HIP-3 assets (dex:symbol format)
 *
 * @param symbol - Asset symbol (e.g., "BTC" or "xyz:TSLA")
 * @param kPrefixAssets - Optional set of assets that have a 'k' prefix to remove
 * @returns Icon URL for the asset
 *
 * @example Regular asset
 * getAssetIconUrl('BTC') // → 'https://app.hyperliquid.xyz/coins/BTC.svg'
 *
 * @example HIP-3 asset
 * getAssetIconUrl('xyz:TSLA') // → 'https://raw.githubusercontent.com/.../hip3%3Axyz_TSLA.svg'
 *
 * @example With k-prefix handling
 * getAssetIconUrl('kBONK', new Set(['KBONK'])) // → 'https://app.hyperliquid.xyz/coins/BONK.svg'
 */
export const getAssetIconUrl = (
  symbol: string,
  kPrefixAssets?: Set<string>,
): string => {
  if (!symbol) return '';

  // Check for HIP-3 asset (contains colon) BEFORE uppercasing
  if (symbol.includes(':')) {
    const [dex, assetSymbol] = symbol.split(':');
    // Keep DEX lowercase, uppercase asset: xyz:XYZ100 -> xyz_XYZ100
    const hip3Symbol = `${dex.toLowerCase()}_${assetSymbol.toUpperCase()}`;
    return `${HIP3_ASSET_ICONS_BASE_URL}hip3%3A${hip3Symbol}.svg`;
  }

  // For regular assets, uppercase the entire symbol
  let processedSymbol = symbol.toUpperCase();

  // Remove 'k' prefix only for specific assets if provided
  if (kPrefixAssets?.has(processedSymbol)) {
    processedSymbol = processedSymbol.substring(1);
  }

  // Regular asset
  return `${HYPERLIQUID_ASSET_ICONS_BASE_URL}${processedSymbol}.svg`;
};
