import type { ChartCandleSkeletonCandle } from './ChartCandleSkeleton.types';

export const CHART_CANDLE_SKELETON_DEFAULT_HEIGHT = 350;

/** Price pane, volume pane, then the remainder for the time axis. */
export const CHART_CANDLE_SKELETON_PRICE_PANE_RATIO = 0.72;
export const CHART_CANDLE_SKELETON_VOLUME_PANE_RATIO = 0.2;

export const CHART_CANDLE_SKELETON_HORIZONTAL_GRID_COUNT = 6;
export const CHART_CANDLE_SKELETON_VERTICAL_GRID_COUNT = 5;
export const CHART_CANDLE_SKELETON_X_AXIS_LABEL_COUNT = 6;

export const CHART_CANDLE_SKELETON_PANE_SEPARATOR_HEIGHT = 1;
export const CHART_CANDLE_SKELETON_GRID_LINE_THICKNESS = 1;
export const CHART_CANDLE_SKELETON_WICK_WIDTH = 1;
/** Body width as a fraction of one candle slot. */
export const CHART_CANDLE_SKELETON_BODY_SLOT_RATIO = 0.7;

export const CHART_CANDLE_SKELETON_Y_PILL_WIDTH = 44;
export const CHART_CANDLE_SKELETON_Y_PILL_HEIGHT = 10;
export const CHART_CANDLE_SKELETON_X_PILL_WIDTH = 36;
export const CHART_CANDLE_SKELETON_X_PILL_HEIGHT = 10;
export const CHART_CANDLE_SKELETON_PILL_RADIUS = 2;
/** Room for a price pill plus a small inset from the plot. */
export const CHART_CANDLE_SKELETON_Y_AXIS_WIDTH = 52;

/**
 * Fixed candle layout. The component multiplies these fractions by the pane
 * size. Nothing here is derived.
 */
export const CHART_CANDLE_SKELETON_CANDLES: readonly ChartCandleSkeletonCandle[] =
  [
    {
      bodyTop: 0.4,
      bodyHeight: 0.08,
      wickTop: 0.34,
      wickHeight: 0.2,
      volume: 0.3,
    },
    {
      bodyTop: 0.52,
      bodyHeight: 0.1,
      wickTop: 0.44,
      wickHeight: 0.26,
      volume: 0.48,
    },
    {
      bodyTop: 0.38,
      bodyHeight: 0.09,
      wickTop: 0.3,
      wickHeight: 0.24,
      volume: 0.36,
    },
    {
      bodyTop: 0.62,
      bodyHeight: 0.12,
      wickTop: 0.5,
      wickHeight: 0.32,
      volume: 0.84,
    },
    {
      bodyTop: 0.48,
      bodyHeight: 0.07,
      wickTop: 0.4,
      wickHeight: 0.22,
      volume: 0.28,
    },
    {
      bodyTop: 0.7,
      bodyHeight: 0.11,
      wickTop: 0.58,
      wickHeight: 0.3,
      volume: 0.55,
    },
    {
      bodyTop: 0.58,
      bodyHeight: 0.08,
      wickTop: 0.5,
      wickHeight: 0.22,
      volume: 0.34,
    },
    {
      bodyTop: 0.36,
      bodyHeight: 0.06,
      wickTop: 0.28,
      wickHeight: 0.2,
      volume: 0.22,
    },
    {
      bodyTop: 0.36,
      bodyHeight: 0.02,
      wickTop: 0.28,
      wickHeight: 0.16,
      volume: 0.18,
    },
    {
      bodyTop: 0.24,
      bodyHeight: 0.08,
      wickTop: 0.16,
      wickHeight: 0.22,
      volume: 0.4,
    },
    {
      bodyTop: 0.42,
      bodyHeight: 0.1,
      wickTop: 0.32,
      wickHeight: 0.28,
      volume: 0.5,
    },
    {
      bodyTop: 0.18,
      bodyHeight: 0.09,
      wickTop: 0.1,
      wickHeight: 0.26,
      volume: 0.72,
    },
    {
      bodyTop: 0.12,
      bodyHeight: 0.06,
      wickTop: 0.06,
      wickHeight: 0.18,
      volume: 0.9,
    },
    {
      bodyTop: 0.3,
      bodyHeight: 0.1,
      wickTop: 0.2,
      wickHeight: 0.28,
      volume: 0.44,
    },
    {
      bodyTop: 0.22,
      bodyHeight: 0.07,
      wickTop: 0.14,
      wickHeight: 0.22,
      volume: 0.26,
    },
    {
      bodyTop: 0.48,
      bodyHeight: 0.12,
      wickTop: 0.36,
      wickHeight: 0.32,
      volume: 0.58,
    },
    {
      bodyTop: 0.66,
      bodyHeight: 0.1,
      wickTop: 0.54,
      wickHeight: 0.3,
      volume: 0.46,
    },
    {
      bodyTop: 0.54,
      bodyHeight: 0.08,
      wickTop: 0.44,
      wickHeight: 0.26,
      volume: 0.32,
    },
    {
      bodyTop: 0.74,
      bodyHeight: 0.11,
      wickTop: 0.62,
      wickHeight: 0.28,
      volume: 0.8,
    },
    {
      bodyTop: 0.46,
      bodyHeight: 0.09,
      wickTop: 0.34,
      wickHeight: 0.28,
      volume: 0.38,
    },
  ];
