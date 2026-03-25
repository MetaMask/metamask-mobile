/** Duration of the sweep traveling around the border in ms */
export const BORDER_SWEEP_DURATION_MS = 1000;

/** Border radius matching Tailwind's rounded-2xl (16px) */
export const BORDER_RADIUS = 16;

/** Stroke width of the sharp main border line */
export const BORDER_STROKE_WIDTH = 3;

/** Stroke width of the soft glow layer behind the main stroke (simulates blur) */
export const BORDER_GLOW_STROKE_WIDTH = 7;

/** Opacity multiplier for the glow layer */
export const BORDER_GLOW_OPACITY = 0.15;

/** Fraction of the perimeter visible as the sweep segment */
export const BORDER_TRAIL_FRACTION = 0.25;

/** Fraction of progress used for the fade-in at the start of the sweep */
export const BORDER_FADE_IN_FRACTION = 0.5;

/** Fraction of progress used for the fade-out at the end of the sweep */
export const BORDER_FADE_OUT_FRACTION = 0.5;

/**
 * Gradient stop colors: purple → orange → card background.
 * The third stop makes the trailing end blend into the card surface.
 */
export const BORDER_GRADIENT_COLORS = [
  '#D075FF',
  '#FF5C16',
  '#1C1D1F',
] as const;

/** Fraction of the card that must be visible on-screen to trigger the animation (1 = fully visible) */
export const VISIBILITY_THRESHOLD = 1;

/** How often (ms) to poll visibility via measureInWindow */
export const VISIBILITY_CHECK_INTERVAL_MS = 150;
