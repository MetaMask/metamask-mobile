/** Resting pitch: bottom edge lifts toward the viewer (bottom-left closest). */
export const PHYSICAL_CARD_REST_ROTATE_X_DEG = 4;

/** Resting yaw: right edge recedes, left edge lifts toward the viewer. */
export const PHYSICAL_CARD_REST_ROTATE_Y_DEG = 6;

/** Slight counter-clockwise rest twist from the physical-card promo. */
export const PHYSICAL_CARD_REST_ROTATE_Z_DEG = -1;

/** Max extra pitch (degrees) applied from vertical pointer position. */
export const PHYSICAL_CARD_PRESS_MAX_ROTATE_X_DEG = 5;

/** Max extra yaw (degrees) applied from horizontal pointer position. */
export const PHYSICAL_CARD_PRESS_MAX_ROTATE_Y_DEG = 6;

export const CARD_TILT_SPRING = { damping: 16, stiffness: 180 } as const;
