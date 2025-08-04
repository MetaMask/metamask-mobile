import { Colors } from '../../../../util/theme/models';

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
  GRID_LINE_COUNT: 6,
  PADDING: {
    HORIZONTAL: 24, // Account for horizontal padding
    VERTICAL: 120, // Account for labels and padding
  },
} as const;

/**
 * Available time intervals for candlestick chart
 */
export const CHART_INTERVALS = [
  { label: '1M', value: '1m' },
  { label: '5M', value: '5m' },
  { label: '15M', value: '15m' },
  { label: '30M', value: '30m' },
  { label: '1H', value: '1h' },
  { label: '2H', value: '2h' },
  { label: '4H', value: '4h' },
  { label: '8H', value: '8h' },
] as const;

/**
 * Available time durations for chart view
 */
export const TIME_DURATIONS = [
  { label: '1hr', value: '1hr' },
  { label: '1D', value: '1d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1m' },
  { label: 'YTD', value: 'ytd' },
  { label: 'Max', value: 'max' },
] as const;

/**
 * Available candle periods mapped to each time duration
 * This ensures users only see sensible candle periods for each duration
 * and keeps the chart readable on mobile screens (target: ~20-100 candles)
 */
export const DURATION_CANDLE_PERIODS = {
  '1hr': {
    periods: [
      { label: '3min', value: '3m' }, // 20 candles
      { label: '5min', value: '5m' }, // 12 candles
      { label: '15min', value: '15m' }, // 4 candles
    ],
    default: '3m', // Good detail for 1 hour view
  },
  '1d': {
    periods: [
      { label: '15min', value: '15m' }, // 96 candles
      { label: '1h', value: '1h' }, // 24 candles
      { label: '2h', value: '2h' }, // 12 candles
      { label: '4h', value: '4h' }, // 6 candles
    ],
    default: '1h', // Good balance for daily view
  },
  '1w': {
    periods: [
      { label: '1h', value: '1h' }, // 168 candles (bit high, but acceptable)
      { label: '2h', value: '2h' }, // 84 candles
      { label: '4h', value: '4h' }, // 42 candles
      { label: '8h', value: '8h' }, // 21 candles
      { label: '1D', value: '1d' }, // 7 candles
    ],
    default: '4h', // Good detail for weekly view
  },
  '1m': {
    periods: [
      { label: '8h', value: '8h' }, // 90 candles (30 days * 3 per day)
      { label: '12h', value: '12h' }, // 60 candles (30 days * 2 per day)
      { label: '1D', value: '1d' }, // 30 candles
      { label: '1W', value: '1w' }, // ~4 candles
    ],
    default: '1d', // Daily candles for monthly view
  },
  ytd: {
    periods: [
      { label: '1D', value: '1d' }, // ~365 candles (will be capped)
      { label: '1W', value: '1w' }, // ~52 candles
    ],
    default: '1w', // Weekly candles for yearly view
  },
  max: {
    periods: [
      { label: '1W', value: '1w' }, // ~104 candles (2 years)
    ],
    default: '1w', // Only weekly makes sense for max view
  },
} as const;

/**
 * Legacy: All available candle periods (for backward compatibility)
 * @deprecated Use DURATION_CANDLE_PERIODS instead
 * Only includes API-supported intervals
 */
export const CANDLE_PERIODS = [
  { label: '3min', value: '3m' },
  { label: '5min', value: '5m' },
  { label: '15min', value: '15m' },
  { label: '30min', value: '30m' },
  { label: '1h', value: '1h' },
  { label: '2h', value: '2h' },
  { label: '4h', value: '4h' },
  { label: '8h', value: '8h' },
  { label: '12h', value: '12h' },
  { label: '1D', value: '1d' },
  { label: '3D', value: '3d' },
  { label: '1W', value: '1w' },
  { label: '1M', value: '1M' },
] as const;

/**
 * Get available candle periods for a specific duration
 */
export const getCandlePeriodsForDuration = (duration: string) =>
  DURATION_CANDLE_PERIODS[duration as keyof typeof DURATION_CANDLE_PERIODS]
    ?.periods || [];

/**
 * Get the default candle period for a specific duration
 */
export const getDefaultCandlePeriodForDuration = (duration: string): string =>
  DURATION_CANDLE_PERIODS[duration as keyof typeof DURATION_CANDLE_PERIODS]
    ?.default || '1h';

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
  duration: string,
  candlePeriod: string,
): number => {
  // Convert candle period to minutes
  const periodInMinutes = (() => {
    switch (candlePeriod) {
      case '3m':
        return 3;
      case '5m':
        return 5;
      case '15m':
        return 15;
      case '30m':
        return 30;
      case '1h':
        return 60;
      case '2h':
        return 120;
      case '4h':
        return 240;
      case '8h':
        return 480;
      case '12h':
        return 720;
      case '1d':
        return 1440; // 24 * 60
      case '3d':
        return 4320; // 3 * 24 * 60
      case '1w':
        return 10080; // 7 * 24 * 60
      case '1M':
        return 43200; // 30 * 24 * 60 (approximate)
      default:
        return 60; // Default to 1h
    }
  })();

  // Convert duration to total minutes needed
  const durationInMinutes = (() => {
    switch (duration) {
      case '1hr':
        return 60; // 1 hour
      case '1d':
        return 60 * 24; // 1 day
      case '1w':
        return 60 * 24 * 7; // 1 week
      case '1m':
        return 60 * 24 * 30; // 1 month (30 days)
      case 'ytd':
        return 60 * 24 * 365; // Year to date (365 days max)
      case 'max':
        return 60 * 24 * 365 * 2; // Max (2 years)
      default:
        return 60 * 24; // Default to 1 day
    }
  })();

  // Calculate number of candles needed
  const candleCount = Math.ceil(durationInMinutes / periodInMinutes);

  // Cap at mobile-friendly limits for better UX and performance
  // Target: 10-100 candles for optimal mobile chart readability
  return Math.min(Math.max(candleCount, 10), 100);
};
