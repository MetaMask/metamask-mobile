/**
 * Opacity pulse copied from `@metamask/design-system-react-native` Skeleton:
 * 0.2 → 0.1 over 700ms, then back, repeating.
 */
export const SKELETON_PULSE_MAX_OPACITY = 0.2;
export const SKELETON_PULSE_MIN_OPACITY = 0.1;
export const SKELETON_PULSE_STEP_MS = 700;

export const CHART_SKELETON_CANDLE_COUNT = 32;
export const CHART_SKELETON_PRICE_PANE_RATIO = 0.72;
export const CHART_SKELETON_VOLUME_PANE_RATIO = 0.2;
export const CHART_SKELETON_HORIZONTAL_GRID_COUNT = 6;
export const CHART_SKELETON_VERTICAL_GRID_COUNT = 5;
export const CHART_SKELETON_X_AXIS_LABEL_COUNT = 6;

export const CHART_SKELETON_PANE_SEPARATOR_HEIGHT = 1;
export const CHART_SKELETON_GRID_LINE_THICKNESS = 1;
export const CHART_SKELETON_WICK_WIDTH = 1;
export const CHART_SKELETON_BODY_SLOT_RATIO = 0.7;

export const CHART_SKELETON_Y_PILL_WIDTH = 44;
export const CHART_SKELETON_Y_PILL_HEIGHT = 10;
export const CHART_SKELETON_X_PILL_WIDTH = 36;
export const CHART_SKELETON_X_PILL_HEIGHT = 10;
export const CHART_SKELETON_PILL_RADIUS = 2;
/** Room for a 44px price pill plus a small inset from the plot. */
export const CHART_SKELETON_Y_AXIS_WIDTH = 52;

export interface ChartSkeletonCandleGeometry {
  bodyTopRatio: number;
  bodyHeightRatio: number;
  wickTopRatio: number;
  wickHeightRatio: number;
}

/**
 * One candle. `center` is the body midpoint as a fraction of the price pane
 * (0 at the top). `volume` is the bar height as a fraction of the volume pane.
 */
interface ChartSkeletonCandle {
  center: number;
  body: number;
  upperWick: number;
  lowerWick: number;
  volume: number;
}

/**
 * Authored closes as a fraction of the price pane (0 at the top). The path
 * swings up and down across most of the pane with no overall direction, so the
 * placeholder reads as a live market instead of a straight trend.
 */
const CHART_SKELETON_CLOSES: readonly number[] = [
  0.32, 0.55, 0.41, 0.73, 0.55, 0.82, 0.68, 0.45, 0.45, 0.27, 0.45, 0.18, 0.1,
  0.32, 0.22, 0.55, 0.78, 0.64, 0.9, 0.78, 0.5, 0.64, 0.41, 0.22, 0.36, 0.1,
  0.27, 0.55, 0.45, 0.45, 0.6, 0.38,
];
const CHART_SKELETON_OPEN_FIRST = 0.45;
/** Smallest body, so a flat step reads as a doji instead of vanishing. */
const CHART_SKELETON_MIN_BODY = 0.012;
/** Tallest body. A larger move keeps its reach through the wicks. */
const CHART_SKELETON_MAX_BODY = 0.12;
/** Candle indexes that carry a volume spike. */
const CHART_SKELETON_VOLUME_SPIKES: readonly number[] = [3, 12, 18, 25];
const CHART_SKELETON_PANE_INSET = 0.08;

const CHART_SKELETON_CANDLES: readonly ChartSkeletonCandle[] =
  CHART_SKELETON_CLOSES.map((close, index) => {
    const open =
      index === 0
        ? CHART_SKELETON_OPEN_FIRST
        : CHART_SKELETON_CLOSES[index - 1];
    const range = 1 - CHART_SKELETON_PANE_INSET * 2;
    const move = Math.abs(close - open) * range;
    const body = Math.min(
      CHART_SKELETON_MAX_BODY,
      Math.max(CHART_SKELETON_MIN_BODY, move),
    );
    const overflow = Math.max(0, move - body) / 2;
    const center = CHART_SKELETON_PANE_INSET + ((open + close) / 2) * range;
    // Fixed pseudo-pattern, so wick lengths vary but never change between loads.
    const upperWick = overflow + 0.015 + ((index * 7) % 5) * 0.012;
    const lowerWick = overflow + 0.015 + ((index * 11) % 5) * 0.012;
    const spike = CHART_SKELETON_VOLUME_SPIKES.includes(index) ? 0.3 : 0;
    return {
      center,
      body,
      upperWick,
      lowerWick,
      volume: Math.min(1, 0.16 + move * 1.6 + spike),
    };
  });

/** Fixed volume-bar heights as a fraction of the volume pane. Bottom-aligned. */
export const CHART_SKELETON_VOLUME_HEIGHT_RATIOS: readonly number[] =
  CHART_SKELETON_CANDLES.map((candle) => candle.volume);

/**
 * Static candle geometry for `index`. Ratios scale with the price pane.
 * Wicks stay 1px wide; their length comes from the authored wick fractions.
 */
export const getChartSkeletonCandleGeometry = (
  index: number,
): ChartSkeletonCandleGeometry => {
  const candle = CHART_SKELETON_CANDLES[index] ?? CHART_SKELETON_CANDLES[0];
  const bodyTopRatio = candle.center - candle.body / 2;
  const wickTopRatio = bodyTopRatio - candle.upperWick;

  return {
    bodyTopRatio,
    bodyHeightRatio: candle.body,
    wickTopRatio,
    wickHeightRatio: candle.upperWick + candle.body + candle.lowerWick,
  };
};

export const getChartSkeletonPaneHeights = (height: number) => {
  const separator = CHART_SKELETON_PANE_SEPARATOR_HEIGHT;
  const inner = Math.max(0, height - separator);
  const priceHeight = Math.round(inner * CHART_SKELETON_PRICE_PANE_RATIO);
  const volumeHeight = Math.round(inner * CHART_SKELETON_VOLUME_PANE_RATIO);
  const axisHeight = Math.max(0, inner - priceHeight - volumeHeight);

  return { priceHeight, volumeHeight, axisHeight, separator };
};
