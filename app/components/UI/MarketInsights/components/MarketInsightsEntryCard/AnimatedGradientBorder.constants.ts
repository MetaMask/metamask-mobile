/** Duration of the sweep traveling around the border in ms */
export const BORDER_SWEEP_DURATION_MS = 800;

/** Border radius matching Tailwind's rounded-xl (12px) */
export const BORDER_RADIUS = 12;

/** Stroke width of the sharp main border line */
export const BORDER_STROKE_WIDTH = 2.5;

/** Fraction of the perimeter visible as the sweep segment
 * How long the trail is
 */
export const BORDER_TRAIL_FRACTION = 0.5;

/**
 * Elastic trail: at sweep start/end the trail length is this fraction of
 * the peak length (`BORDER_TRAIL_FRACTION * perimeter`). Middle of sweep uses
 * the full peak length. 1 disables compression at the ends.
 */
export const BORDER_TRAIL_ELASTIC_END_RATIO = 0.5;

/**
 * Constant phase added to `strokeDashoffset` (`perimeter * this`), independent
 * of animation progress (rotates where the dash sits on the path).
 */
export const BORDER_DASH_START_SHIFT_FRACTION = 0.4;

/**
 * Normalized sweep at `p === 0`. See `AnimatedGradientBorder` worklet:
 * `sweepT = start + p * (end - start)`, `pathPhase = 1 - sweepT`.
 */
export const BORDER_SWEEP_PATH_START_FRACTION = 0;

/** Normalized sweep position when the animation completes (`p === 1`). */
export const BORDER_SWEEP_PATH_END_FRACTION = 1;

/**
 * Opacity fade-in completes at this animation progress (`p`). Lower = trail
 * reaches full opacity sooner (quicker fade-in). Must stay below
 * `BORDER_TRAIL_OPACITY_FADE_OUT_START_FRACTION`.
 */
export const BORDER_TRAIL_OPACITY_FADE_IN_END_FRACTION = 0.5;

/** Opacity fade-out begins at this `p` (second segment uses cubic ease-out). */
export const BORDER_TRAIL_OPACITY_FADE_OUT_START_FRACTION = 0.7;

/** Trail tail (follows the sweep from behind). */
export const BORDER_GRADIENT_TAIL = '#D86FCF';

/** Trail head (leading edge of the sweep). */
export const BORDER_GRADIENT_HEAD = '#ED666E';

/** [tail, head] for consumers that need both (e.g. card chrome gradient). */
export const BORDER_GRADIENT_COLORS = [
  BORDER_GRADIENT_TAIL,
  BORDER_GRADIENT_HEAD,
] as const;

/** Fraction of the card that must be visible on-screen to trigger the animation (1 = fully visible) */
export const VISIBILITY_THRESHOLD = 1;
