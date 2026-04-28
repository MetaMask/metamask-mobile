import { Dimensions } from 'react-native';

/**
 * Token overview chart column height (AdvancedChart / TradingView + legacy line when shown).
 * Single source of truth so native SVG and WebView blocks align.
 */
export const TOKEN_OVERVIEW_CHART_HEIGHT =
  Dimensions.get('screen').height * 0.24;

/** Minimum distributed price points to draw the legacy line chart (matches advanced fallback). */
export const CHART_DATA_THRESHOLD = 5;

/**
 * Min height for the token overview time-range row (advanced selector + legacy period nav).
 * Matches TimeRangeSelector skeleton height so swapping loading/loaded does not shift content
 * below (e.g. Receive/More).
 */
export const TOKEN_OVERVIEW_TIME_RANGE_ROW_HEIGHT = 34;
