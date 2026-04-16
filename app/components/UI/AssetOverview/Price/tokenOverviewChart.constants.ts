import { Dimensions } from 'react-native';

/**
 * Token overview chart column height (AdvancedChart / TradingView + legacy line when shown).
 * Single source of truth so native SVG and WebView blocks align.
 */
export const TOKEN_OVERVIEW_CHART_HEIGHT =
  Dimensions.get('screen').height * 0.24;

/** Minimum distributed price points to draw the legacy line chart (matches advanced fallback). */
export const CHART_DATA_THRESHOLD = 5;
