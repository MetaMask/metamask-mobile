/** Duration of the sweep traveling around the border in ms */
export const BORDER_SWEEP_DURATION_MS = 1000;

/** Border radius matching Tailwind's rounded-2xl (16px) */
export const BORDER_RADIUS = 16;

/** Stroke width of the sharp main border line */
export const BORDER_STROKE_WIDTH = 3;

/** Fraction of the perimeter visible as the sweep segment
 * How long the trail is
 */
export const BORDER_TRAIL_FRACTION = 0.4;

/** Fraction of progress used for the fade-in at the start of the sweep
 * How long the fade-in is
 */
export const BORDER_FADE_IN_FRACTION = 0.8;

/** Fraction of progress used for the fade-out at the end of the sweep
 * How long the fade-out is
 */
export const BORDER_FADE_OUT_FRACTION = 0.8;

/** Gradient stop colors: pink/purple → orange */
export const BORDER_GRADIENT_COLORS = ['#D075FF', '#FF5C16'] as const;

/** Fraction of the card that must be visible on-screen to trigger the animation (1 = fully visible) */
export const VISIBILITY_THRESHOLD = 1;
