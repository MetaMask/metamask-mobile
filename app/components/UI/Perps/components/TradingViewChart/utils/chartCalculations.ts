import { CandlePeriod, TimeDuration } from '../../../constants/chartConfig';

/**
 * Converts time duration enum to minutes
 */
export const getDurationInMinutes = (
  duration: TimeDuration | string,
): number => {
  switch (duration) {
    case TimeDuration.ONE_HOUR:
      return 60;
    case TimeDuration.ONE_DAY:
      return 24 * 60; // 1440 minutes
    case TimeDuration.ONE_WEEK:
      return 7 * 24 * 60; // 10080 minutes
    case TimeDuration.ONE_MONTH:
      return 30 * 24 * 60; // 43200 minutes
    case TimeDuration.YEAR_TO_DATE:
      return 365 * 24 * 60; // 525600 minutes
    case TimeDuration.MAX:
      return 2 * 365 * 24 * 60; // 2 years in minutes
    default:
      return 24 * 60; // Default to 1 day
  }
};

/**
 * Converts candle period enum to minutes
 */
export const getPeriodInMinutes = (period: CandlePeriod | string): number => {
  switch (period) {
    case CandlePeriod.ONE_MINUTE:
      return 1;
    case CandlePeriod.THREE_MINUTES:
      return 3;
    case CandlePeriod.FIVE_MINUTES:
      return 5;
    case CandlePeriod.FIFTEEN_MINUTES:
      return 15;
    case CandlePeriod.THIRTY_MINUTES:
      return 30;
    case CandlePeriod.ONE_HOUR:
      return 60;
    case CandlePeriod.TWO_HOURS:
      return 2 * 60;
    case CandlePeriod.FOUR_HOURS:
      return 4 * 60;
    case CandlePeriod.EIGHT_HOURS:
      return 8 * 60;
    case CandlePeriod.TWELVE_HOURS:
      return 12 * 60;
    case CandlePeriod.ONE_DAY:
      return 24 * 60;
    case CandlePeriod.THREE_DAYS:
      return 3 * 24 * 60;
    case CandlePeriod.ONE_WEEK:
      return 7 * 24 * 60;
    case CandlePeriod.ONE_MONTH:
      return 30 * 24 * 60;
    default:
      return 60; // Default to 1 hour
  }
};

/**
 * Calculates the number of candles needed for a given duration and period
 * Enforces minimum of 10 and maximum of 500 candles
 */
export const getCandleCount = (
  duration: TimeDuration | string,
  period: CandlePeriod | string,
): number => {
  const durationMinutes = getDurationInMinutes(duration);
  const periodMinutes = getPeriodInMinutes(period);

  const rawCount = Math.ceil(durationMinutes / periodMinutes);

  // Enforce bounds: minimum 10, maximum 500
  return Math.max(10, Math.min(500, rawCount));
};

/**
 * Creates an interval update message for the TradingView chart
 */
export const createIntervalUpdateMessage = (
  duration: TimeDuration | string,
  candlePeriod: CandlePeriod | string,
) => {
  const candleCount = getCandleCount(duration, candlePeriod);

  return {
    type: 'UPDATE_INTERVAL',
    duration,
    candlePeriod,
    candleCount,
    timestamp: new Date().toISOString(),
  };
};
