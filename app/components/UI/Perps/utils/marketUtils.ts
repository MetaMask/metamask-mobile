import type { CandleData, CandleStick } from '../types';

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
