import { Colors } from '../../../../util/theme/models';

/**
 * Enum for available candle periods
 * Provides type safety and prevents typos when referencing candle periods
 */
export enum CandlePeriod {
  ONE_MINUTE = '1m',
  THREE_MINUTES = '3m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  TWO_HOURS = '2h',
  FOUR_HOURS = '4h',
  EIGHT_HOURS = '8h',
  TWELVE_HOURS = '12h',
  ONE_DAY = '1d',
  THREE_DAYS = '3d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1M',
}

/**
 * Enum for available time durations
 * Provides type safety and prevents typos when referencing durations
 */
export enum TimeDuration {
  ONE_HOUR = '1hr',
  ONE_DAY = '1d',
  ONE_WEEK = '1w',
  ONE_MONTH = '1m',
  YEAR_TO_DATE = 'ytd',
  MAX = 'max',
}

/**
 * Enum for chart intervals (legacy support)
 * Note: Some intervals overlap with CandlePeriod but serve different purposes
 */
export enum ChartInterval {
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h',
  TWO_HOURS = '2h',
  FOUR_HOURS = '4h',
  EIGHT_HOURS = '8h',
}

/**
 * Configuration for Perps candlestick chart colors
 * These values can be customized or potentially made configurable via settings
 */
export const PERPS_CHART_CONFIG = {
  POSITIVE_CANDLE_COLOR: (colors: Colors) => colors.success.default,
  NEGATIVE_CANDLE_COLOR: (colors: Colors) => colors.error.default,
  DEFAULT_HEIGHT: 300,
  GRID_LINE_OPACITY: {
    MAJOR: 0.8,
    MINOR: 0.6,
  },
  INTERVAL_SELECTOR_OPACITY: 0.7,
  GRID_LINE_COUNT: 4, // Reduced for better distinctiveness with smaller datasets
  PADDING: {
    HORIZONTAL: 24, // Account for horizontal padding
    VERTICAL: 120, // Account for labels and padding
  },
  // Chart zoom configuration
  CANDLE_COUNT: {
    MIN: 10, // Minimum candles to display (zoomed in)
    DEFAULT: 30, // Default candles to display (detail view) - reduced from 45 for thicker candle bodies
    FULLSCREEN: 90, // Candles to display in fullscreen landscape mode
    MAX: 250, // Maximum candles to display (zoomed out)
    TOTAL: 500, // Total candles to load in memory (reduced for better performance)
  },
  // Default candle period settings
  DEFAULT_CANDLE_PERIOD: CandlePeriod.FIFTEEN_MINUTES,
  // Chart layout constants
  LAYOUT: {
    DETAIL_VIEW_HEIGHT: 350, // Height for chart in market detail view
    FULLSCREEN_INITIAL_HEIGHT_RATIO: 0.7, // Initial height as ratio of screen height
    HEIGHT_CHANGE_THRESHOLD: 10, // Minimum pixels change to trigger height update (debouncing)
  },
} as const;

/**
 * Available time intervals for candlestick chart
 */
export const CHART_INTERVALS = [
  { label: '1M', value: ChartInterval.ONE_MINUTE },
  { label: '5M', value: ChartInterval.FIVE_MINUTES },
  { label: '15M', value: ChartInterval.FIFTEEN_MINUTES },
  { label: '30M', value: ChartInterval.THIRTY_MINUTES },
  { label: '1H', value: ChartInterval.ONE_HOUR },
  { label: '2H', value: ChartInterval.TWO_HOURS },
  { label: '4H', value: ChartInterval.FOUR_HOURS },
  { label: '8H', value: ChartInterval.EIGHT_HOURS },
] as const;

/**
 * Available time durations for chart view
 */
export const TIME_DURATIONS = [
  { label: '1hr', value: TimeDuration.ONE_HOUR },
  { label: '1D', value: TimeDuration.ONE_DAY },
  { label: '1W', value: TimeDuration.ONE_WEEK },
  { label: '1M', value: TimeDuration.ONE_MONTH },
  { label: 'YTD', value: TimeDuration.YEAR_TO_DATE },
  { label: 'Max', value: TimeDuration.MAX },
] as const;

/**
 * Available candle periods mapped to each time duration
 * This ensures users only see sensible candle periods for each duration
 * and keeps the chart readable on mobile screens (target: ~20-100 candles)
 */
export const DURATION_CANDLE_PERIODS = {
  [TimeDuration.ONE_HOUR]: {
    periods: [
      { label: '1min', value: CandlePeriod.ONE_MINUTE }, // 60 candles
      { label: '3min', value: CandlePeriod.THREE_MINUTES }, // 20 candles
      { label: '5min', value: CandlePeriod.FIVE_MINUTES }, // 12 candles
      { label: '15min', value: CandlePeriod.FIFTEEN_MINUTES }, // 4 candles
    ],
    default: CandlePeriod.ONE_MINUTE, // 1-minute candles for development/testing
  },
  [TimeDuration.ONE_DAY]: {
    periods: [
      { label: '15min', value: CandlePeriod.FIFTEEN_MINUTES }, // 96 candles
      { label: '1h', value: CandlePeriod.ONE_HOUR }, // 24 candles
      { label: '2h', value: CandlePeriod.TWO_HOURS }, // 12 candles
      { label: '4h', value: CandlePeriod.FOUR_HOURS }, // 6 candles
    ],
    default: CandlePeriod.ONE_HOUR, // Good balance for daily view
  },
  [TimeDuration.ONE_WEEK]: {
    periods: [
      { label: '1h', value: CandlePeriod.ONE_HOUR }, // 168 candles (bit high, but acceptable)
      { label: '2h', value: CandlePeriod.TWO_HOURS }, // 84 candles
      { label: '4h', value: CandlePeriod.FOUR_HOURS }, // 42 candles
      { label: '8h', value: CandlePeriod.EIGHT_HOURS }, // 21 candles
      { label: '1D', value: CandlePeriod.ONE_DAY }, // 7 candles
    ],
    default: CandlePeriod.FOUR_HOURS, // Good detail for weekly view
  },
  [TimeDuration.ONE_MONTH]: {
    periods: [
      { label: '8h', value: CandlePeriod.EIGHT_HOURS }, // 90 candles (30 days * 3 per day)
      { label: '12h', value: CandlePeriod.TWELVE_HOURS }, // 60 candles (30 days * 2 per day)
      { label: '1D', value: CandlePeriod.ONE_DAY }, // 30 candles
      { label: '1W', value: CandlePeriod.ONE_WEEK }, // ~4 candles
    ],
    default: CandlePeriod.ONE_DAY, // Daily candles for monthly view
  },
  [TimeDuration.YEAR_TO_DATE]: {
    periods: [
      { label: '1D', value: CandlePeriod.ONE_DAY }, // ~365 candles (will be capped)
      { label: '1W', value: CandlePeriod.ONE_WEEK }, // ~52 candles
    ],
    default: CandlePeriod.ONE_WEEK, // Weekly candles for yearly view
  },
  [TimeDuration.MAX]: {
    periods: [
      { label: '1W', value: CandlePeriod.ONE_WEEK }, // ~104 candles (2 years)
    ],
    default: CandlePeriod.ONE_WEEK, // Only weekly makes sense for max view
  },
} as const;

export const CANDLE_PERIODS = [
  { label: '1m', value: CandlePeriod.ONE_MINUTE },
  { label: '3m', value: CandlePeriod.THREE_MINUTES },
  { label: '5m', value: CandlePeriod.FIVE_MINUTES },
  { label: '15m', value: CandlePeriod.FIFTEEN_MINUTES },
  { label: '30m', value: CandlePeriod.THIRTY_MINUTES },
  { label: '1h', value: CandlePeriod.ONE_HOUR },
  { label: '2h', value: CandlePeriod.TWO_HOURS },
  { label: '4h', value: CandlePeriod.FOUR_HOURS },
  { label: '8h', value: CandlePeriod.EIGHT_HOURS },
  { label: '12h', value: CandlePeriod.TWELVE_HOURS },
  { label: '1d', value: CandlePeriod.ONE_DAY },
  { label: '3d', value: CandlePeriod.THREE_DAYS },
  { label: '7d', value: CandlePeriod.ONE_WEEK },
] as const;

export const DEFAULT_CANDLE_PERIOD = CandlePeriod.FIFTEEN_MINUTES;

/**
 * Get available candle periods for a specific duration
 */
export const getCandlePeriodsForDuration = (
  duration: TimeDuration | string,
) => {
  const periods =
    DURATION_CANDLE_PERIODS[duration as TimeDuration]?.periods || [];

  return periods;
};

/**
 * Get the default candle period for a specific duration
 */
export const getDefaultCandlePeriodForDuration = (
  duration: TimeDuration | string,
): CandlePeriod =>
  DURATION_CANDLE_PERIODS[duration as TimeDuration]?.default ||
  CandlePeriod.ONE_HOUR;

/**
 * Helper function to get candlestick colors from theme
 * Prevents object creation on every render
 */
export const getCandlestickColors = (colors: Colors) => ({
  positive: PERPS_CHART_CONFIG.POSITIVE_CANDLE_COLOR(colors),
  negative: PERPS_CHART_CONFIG.NEGATIVE_CANDLE_COLOR(colors),
});

/**
 * Calculate the number of candles to fetch based on duration and candle period
 */
export const calculateCandleCount = (
  duration: TimeDuration | string,
  candlePeriod: CandlePeriod | string,
): number => {
  // Convert candle period to minutes
  const periodInMinutes = (() => {
    switch (candlePeriod) {
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
        return 120;
      case CandlePeriod.FOUR_HOURS:
        return 240;
      case CandlePeriod.EIGHT_HOURS:
        return 480;
      case CandlePeriod.TWELVE_HOURS:
        return 720;
      case CandlePeriod.ONE_DAY:
        return 1440; // 24 * 60
      case CandlePeriod.THREE_DAYS:
        return 4320; // 3 * 24 * 60
      case CandlePeriod.ONE_WEEK:
        return 10080; // 7 * 24 * 60
      case CandlePeriod.ONE_MONTH:
        return 43200; // 30 * 24 * 60 (approximate)
      default:
        return 60; // Default to 1h
    }
  })();

  // Convert duration to total minutes needed
  const durationInMinutes = (() => {
    switch (duration) {
      case TimeDuration.ONE_HOUR:
        return 60; // 1 hour
      case TimeDuration.ONE_DAY:
        return 60 * 24; // 1 day
      case TimeDuration.ONE_WEEK:
        return 60 * 24 * 7; // 1 week
      case TimeDuration.ONE_MONTH:
        return 60 * 24 * 30; // 1 month (30 days)
      case TimeDuration.YEAR_TO_DATE:
        return 60 * 24 * 365; // Year to date (365 days max)
      case TimeDuration.MAX:
        return 60 * 24 * 365 * 2; // Max (2 years)
      default:
        return 60 * 24; // Default to 1 day
    }
  })();

  // Calculate number of candles needed
  const candleCount = Math.ceil(durationInMinutes / periodInMinutes);

  // Cap at 500 candles max for memory management
  // Allow minimum of 10 candles for basic functionality
  return Math.min(
    Math.max(candleCount, 10),
    PERPS_CHART_CONFIG.CANDLE_COUNT.TOTAL,
  );
};
