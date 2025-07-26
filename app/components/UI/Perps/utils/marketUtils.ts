import type { CandleData, CandleStick } from '../types';

/**
 * Calculate the time until the next funding period
 * HyperLiquid has 8-hour funding periods at 00:00, 08:00, and 16:00 UTC
 */
export const calculateFundingCountdown = (): string => {
  const now = new Date();
  const utcHour = now.getUTCHours();

  // Determine next funding hour (0, 8, or 16)
  let nextFundingHour: number;
  if (utcHour < 8) {
    nextFundingHour = 8;
  } else if (utcHour < 16) {
    nextFundingHour = 16;
  } else {
    nextFundingHour = 24; // Next day at 00:00
  }

  // Create target date for next funding
  const target = new Date(now);
  target.setUTCHours(nextFundingHour % 24, 0, 0, 0);

  // If next funding is tomorrow (24 hours case), add a day
  if (nextFundingHour === 24) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  // Calculate time difference in milliseconds
  const diff = target.getTime() - now.getTime();

  // Convert to hours, minutes, seconds
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  // Format as HH:MM:SS
  const formattedHours = String(hours).padStart(2, '0');
  const formattedMinutes = String(minutes).padStart(2, '0');
  const formattedSeconds = String(seconds).padStart(2, '0');

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
