import type { CandleData, CandleStick } from '../types';

interface FundingCountdownParams {
  /**
   * Next funding time in milliseconds since epoch (optional, market-specific)
   */
  nextFundingTime?: number;
  /**
   * Funding interval in hours (optional, market-specific)
   * Default is 8 hours for HyperLiquid
   */
  fundingIntervalHours?: number;
}

/**
 * Calculate the time until the next funding period
 * Supports market-specific funding times when provided
 * Falls back to default HyperLiquid 8-hour periods at 00:00, 08:00, and 16:00 UTC
 */
export const calculateFundingCountdown = (
  params?: FundingCountdownParams,
): string => {
  const now = new Date();
  const nowMs = now.getTime();

  // If we have a specific next funding time, use it
  if (params?.nextFundingTime && params.nextFundingTime > nowMs) {
    const msUntilFunding = params.nextFundingTime - nowMs;
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

  // Fall back to default calculation for HyperLiquid (8-hour periods)
  const utcHour = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  const utcSeconds = now.getUTCSeconds();

  // Determine next funding hour (0, 8, or 16)
  let nextFundingHour: number;
  if (utcHour < 8) {
    nextFundingHour = 8;
  } else if (utcHour < 16) {
    nextFundingHour = 16;
  } else {
    nextFundingHour = 0; // Next day at 00:00
  }

  // Calculate hours until next funding
  let hoursUntilFunding: number;
  if (nextFundingHour === 0) {
    // If next funding is at 00:00 tomorrow
    hoursUntilFunding = 24 - utcHour;
  } else {
    // If next funding is today
    hoursUntilFunding = nextFundingHour - utcHour;
  }

  // Calculate remaining time
  const hours = hoursUntilFunding - 1; // Subtract 1 because we'll add minutes/seconds
  const minutes = 59 - utcMinutes;
  const seconds = 60 - utcSeconds;

  // Handle edge case where seconds equals 60
  const finalSeconds = seconds === 60 ? 0 : seconds;
  const finalMinutes = seconds === 60 ? minutes + 1 : minutes;
  const finalHours = finalMinutes === 60 ? hours + 1 : hours;
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
