/**
 * Chart configuration constants - Mobile UI layer
 *
 * Controller-portable exports (enums, pure calculations) live in
 * '@metamask/perps-controller/constants/chartConfig' and should be
 * imported from there directly.
 *
 * This file contains only UI-specific exports (Colors, Theme dependencies).
 */
import type { Theme } from '@metamask/design-tokens';
import { ChartInterval, TimeDuration } from '@metamask/perps-controller';

type Colors = Theme['colors'];

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
  DEFAULT_CANDLE_PERIOD: 'FifteenMinutes' as const,
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
  { label: '1M', value: ChartInterval.OneMinute },
  { label: '5M', value: ChartInterval.FiveMinutes },
  { label: '15M', value: ChartInterval.FifteenMinutes },
  { label: '30M', value: ChartInterval.ThirtyMinutes },
  { label: '1H', value: ChartInterval.OneHour },
  { label: '2H', value: ChartInterval.TwoHours },
  { label: '4H', value: ChartInterval.FourHours },
  { label: '8H', value: ChartInterval.EightHours },
] as const;

/**
 * Available time durations for chart view
 */
export const TIME_DURATIONS = [
  { label: '1hr', value: TimeDuration.OneHour },
  { label: '1D', value: TimeDuration.OneDay },
  { label: '1W', value: TimeDuration.OneWeek },
  { label: '1M', value: TimeDuration.OneMonth },
  { label: 'YTD', value: TimeDuration.YearToDate },
  { label: 'Max', value: TimeDuration.Max },
] as const;

/**
 * Helper function to get candlestick colors from theme
 * Prevents object creation on every render
 */
export const getCandlestickColors = (colors: Colors) => ({
  positive: PERPS_CHART_CONFIG.POSITIVE_CANDLE_COLOR(colors),
  negative: PERPS_CHART_CONFIG.NEGATIVE_CANDLE_COLOR(colors),
});
