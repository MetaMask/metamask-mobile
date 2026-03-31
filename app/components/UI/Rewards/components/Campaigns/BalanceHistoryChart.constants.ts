import { Dimensions } from 'react-native';

export const CHART_HEIGHT = 200;
export const CHART_WIDTH = Dimensions.get('window').width;

/**
 * Top content inset — must leave enough room for two label lines above the
 * highest threshold (when the line sits near the top of the plot).
 */
export const CHART_INSET_TOP = 52;
export const CHART_INSET_RIGHT = 10;
/** Extra bottom room so the y=0 baseline stroke is not clipped */
export const CHART_INSET_BOTTOM = 28;
export const CHART_INSET_LEFT = 10;

/** Label baselines above the threshold line (SvgText y = baseline; name higher, value nearer line) */
export const THRESHOLD_LABEL_NAME_OFFSET_ABOVE = 22;
export const THRESHOLD_LABEL_VALUE_OFFSET_ABOVE = 6;

export const GRADIENT_OPACITY_TOP = 0.25;
export const GRADIENT_OPACITY_BOTTOM = 0;

export const THRESHOLD_DASH_ARRAY = '6, 4';
/** Default stroke for non-current tier threshold lines */
export const THRESHOLD_STROKE_WIDTH = 3;
/** Current tier threshold line (emphasis) */
export const THRESHOLD_STROKE_WIDTH_CURRENT = 3.5;

/** Solid horizontal line at y = 0 (linear scale only) */
export const ZERO_BASELINE_STROKE_WIDTH = 3;

export const PLOT_LINE_STROKE_WIDTH = 3;

export const CURSOR_CIRCLE_RADIUS = 5;

export const BALANCE_HISTORY_CHART_TEST_IDS = {
  CONTAINER: 'balance-history-chart-container',
  LOADING: 'balance-history-chart-loading',
  EMPTY: 'balance-history-chart-empty',
  CHART_AREA: 'balance-history-chart-area',
} as const;
