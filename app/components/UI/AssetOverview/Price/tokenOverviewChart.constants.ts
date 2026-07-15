import { Dimensions } from 'react-native';

/**
 * Token overview chart column height (AdvancedChart / TradingView + legacy line when shown).
 * Single source of truth so native SVG and WebView blocks align.
 */
export const TOKEN_OVERVIEW_CHART_HEIGHT =
  Dimensions.get('screen').height * 0.3;

/** Minimum distributed price points to draw the legacy line chart (matches advanced fallback). */
export const CHART_DATA_THRESHOLD = 5;

/**
 * Min height for the token overview time-range row (advanced selector + legacy period nav).
 * Matches TimeRangeSelector skeleton height so swapping loading/loaded does not shift content
 * below (e.g. Receive/More).
 */
export const TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT = 34;

/** Quick-pick candle intervals shown in IntervalBar when technical indicators are enabled. */
export const TOKEN_OVERVIEW_CHART_INTERVALS = [
  '1m',
  '5m',
  '15m',
  '1h',
  '1d',
] as const;

export type TokenOverviewChartInterval =
  (typeof TOKEN_OVERVIEW_CHART_INTERVALS)[number];

/** Default interval when none is persisted (matches 1D time-range WS default). */
export const DEFAULT_TOKEN_OVERVIEW_CHART_INTERVAL: TokenOverviewChartInterval =
  '15m';

export const isTokenOverviewChartInterval = (
  value: string | undefined | null,
): value is TokenOverviewChartInterval =>
  TOKEN_OVERVIEW_CHART_INTERVALS.includes(value as TokenOverviewChartInterval);
