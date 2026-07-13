import type { SliceKey } from './types';
import type { PredictBreakdownCategory } from './utils/inferPredictBreakdownCategory';

/**
 * Slice hooks must set a string; real chart colors come from the active theme in
 * {@link useBalanceBreakdown} via {@link getBalanceBreakdownSliceColors}.
 */
// eslint-disable-next-line @metamask/design-tokens/color-no-hex -- opaque placeholder until theme colors are injected
export const SLICE_COLOR_PLACEHOLDER = '#000000';

export const SLICE_LABELS: Record<SliceKey, string> = {
  tokens: 'Tokens',
  perps: 'Perpetuals',
  predict: 'Predictions',
  defi: 'DeFi',
};

/** Ordered display sequence for legend / donut */
export const SLICE_ORDER: SliceKey[] = ['tokens', 'perps', 'predict', 'defi'];

export const MAX_DRILLDOWN_ROWS = 3;

/** Minimum segment arc size so tiny slices remain tappable */
export const MIN_SEGMENT_SWEEP_DEG = 8;

export const DONUT_RADIUS = 100;
/** Ring thickness (stroke); thinner ring per latest breakdown design. */
export const DONUT_STROKE_WIDTH = 14;
/**
 * Canvas size passed to `BreakdownDonutChart` (must match `BalanceBreakdownView`).
 * Inner hero is centered in the hole: stroke is centered on {@link DONUT_RADIUS}.
 */
export const DONUT_CHART_SIZE = DONUT_RADIUS * 2 + DONUT_STROKE_WIDTH + 24;

/**
 * Max width for the hero fiat line so long amounts stay inside the donut hole.
 */
export function getBalanceBreakdownHeroValueMaxWidth(insetPx = 16): number {
  const innerRadius = DONUT_RADIUS - DONUT_STROKE_WIDTH / 2;
  return Math.max(48, Math.floor(2 * innerRadius - insetPx));
}

/** Angular gap between donut segments (degrees); larger = more space between arcs. */
export const DONUT_GAP_DEG = 12;

/** Donut spin + dimming when a slice is selected. */
export const DONUT_ROTATION_MS = 1000;

export const ANIMATION_DURATION_MS = 1000;

/** Top radial glow crossfade when switching drilldown slices. */
export const DRILLDOWN_GLOW_CROSSFADE_MS = 300;
/** Drilldown block fades up on exit / in from bottom on enter. */
export const DRILLDOWN_CONTENT_EXIT_MS = 180;
export const DRILLDOWN_CONTENT_ENTER_MS = 240;
export const DRILLDOWN_CONTENT_OFFSET_Y = 14;

/** Donut center hero: fade on slice change + count-up for main fiat amount. */
export const HERO_VALUE_FADE_OUT_MS = 160;
export const HERO_VALUE_FADE_IN_MS = 220;
export const HERO_VALUE_FADE_OFFSET_Y = 8;
/** Main balance number tween duration (overview / slice value updates). */
export const HERO_VALUE_COUNT_DURATION_MS = 1600;

export const PERPS_HOMEPAGE_THROTTLE_MS = 1000;

/** Display labels for Predict breakdown category rows. */
export const PREDICT_BREAKDOWN_CATEGORY_LABEL: Record<
  PredictBreakdownCategory,
  string
> = {
  sports: 'Sports',
  politics: 'Politics',
  crypto: 'Crypto',
  other: 'Other',
};
