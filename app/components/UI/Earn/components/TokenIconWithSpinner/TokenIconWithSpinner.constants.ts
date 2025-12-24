import { createArcPath } from './TokenIconWithSpinner.utils';

// Token icon dimensions
export const TOKEN_ICON_SIZE = 32;
export const RING_STROKE_WIDTH = 4;
// Ring size matches token icon - no gap between icon and ring
export const RING_SIZE = TOKEN_ICON_SIZE + RING_STROKE_WIDTH * 2;

// Spinner configuration
export const SPINNER_NUM_SEGMENTS = 18;
export const SPINNER_ARC_DEGREES = 360;
export const SPINNER_DURATION_MS = 1000;

// Pre-calculate arc paths for the gradient spinner
export const SPINNER_RADIUS = (RING_SIZE - RING_STROKE_WIDTH) / 2;
export const SPINNER_CENTER = RING_SIZE / 2;
export const SEGMENT_DEGREES = SPINNER_ARC_DEGREES / SPINNER_NUM_SEGMENTS;

// Pre-calculate all arc paths and opacities at module load time
export const SPINNER_SEGMENTS = Array.from(
  { length: SPINNER_NUM_SEGMENTS },
  (_, i) => ({
    path: createArcPath(
      i * SEGMENT_DEGREES,
      (i + 1) * SEGMENT_DEGREES + 1,
      SPINNER_CENTER,
      SPINNER_RADIUS,
    ),
    opacity: (i + 1) / SPINNER_NUM_SEGMENTS,
  }),
);
