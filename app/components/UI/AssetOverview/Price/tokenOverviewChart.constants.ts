import { Dimensions } from 'react-native';
import type { OHLCVTimePeriod } from '../../Charts/AdvancedChart/TimeRangeSelector';

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

/**
 * Single source of truth for candle intervals in the IntervalBar.
 * Maps each interval to the API timePeriod that returns enough history.
 *
 * To add a new interval: add one entry here. No other files need changes.
 * The UI pills, TypeScript type, type guard, and API mapping all derive from this.
 */
export const CHART_INTERVAL_CONFIGS: Record<string, OHLCVTimePeriod> = {
  '1m': '1d',
  '5m': '1d',
  '15m': '1d',
  '1h': '1w',
  '4h': '1m',
  '1d': '1m',
  '1w': '1y',
};

/** Ordered list of intervals for the IntervalBar UI pills. */
export const TOKEN_OVERVIEW_CHART_INTERVALS = Object.keys(
  CHART_INTERVAL_CONFIGS,
);

export type TokenOverviewChartInterval = keyof typeof CHART_INTERVAL_CONFIGS &
  string;

/** Default interval when none is persisted (matches 1D time-range WS default). */
export const DEFAULT_TOKEN_OVERVIEW_CHART_INTERVAL: TokenOverviewChartInterval =
  '15m';

export const isTokenOverviewChartInterval = (
  value: string | undefined | null,
): value is TokenOverviewChartInterval =>
  typeof value === 'string' && value in CHART_INTERVAL_CONFIGS;
