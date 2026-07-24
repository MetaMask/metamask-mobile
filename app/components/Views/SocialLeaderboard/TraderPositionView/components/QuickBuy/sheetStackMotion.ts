/**
 * Sheet / stack / backdrop motion tokens — mirrored from design-system
 * BottomSheetDialog + BottomSheetOverlay (replit/bottom-sheet / PR #1411)
 * for Quick Buy only until the package ships them.
 *
 * Springs are only for interactive settle (open, snap-back).
 * Surface exits and content nav use tweens on the two iOS curves.
 */

/**
 * Sheet open / snap-back spring — critically damped, no bounce.
 * Matches Framer `stiffness: 540, damping: 55` (mass 1).
 */
export const SHEET_DIALOG_SPRING = {
  stiffness: 540,
  damping: 55,
  mass: 1,
} as const;

/**
 * Offscreen start/end multiplier for open/close (y: 105%).
 */
export const SHEET_DIALOG_OFFSCREEN_FACTOR = 1.05;

/**
 * Sheet dismiss tween duration in ms (0.28s).
 */
export const SHEET_DIALOG_CLOSE_DURATION = 280;

/**
 * iOS sheet curve — fast start, soft landing: [0.32, 0.72, 0, 1].
 */
export const SHEET_DIALOG_CLOSE_EASING = [0.32, 0.72, 0, 1] as const;

/**
 * Drag dismiss distance threshold in px.
 */
export const SHEET_DIALOG_DRAG_DISMISS_OFFSET = 120;

/**
 * Drag dismiss velocity threshold in px/s.
 */
export const SHEET_DIALOG_DRAG_DISMISS_VELOCITY = 800;

/**
 * Downward drag follow factor (1 = 1:1 with the finger).
 */
export const SHEET_DIALOG_DRAG_ELASTIC_DOWN = 1;

/**
 * Content / surface ease — easeOutExpo-style: [0.16, 1, 0.3, 1].
 */
export const SHEET_STACK_CONTENT_EASING = [0.16, 1, 0.3, 1] as const;

/**
 * Backdrop open duration in ms (0.4s).
 */
export const OVERLAY_OPEN_DURATION = 400;

/**
 * Backdrop open curve — same content ease as in-sheet nav.
 */
export const OVERLAY_OPEN_EASING = SHEET_STACK_CONTENT_EASING;

/**
 * Backdrop close duration in ms (0.2s).
 */
export const OVERLAY_CLOSE_DURATION = 200;

/**
 * In-sheet stack push / pop duration in ms (0.45s).
 * Full-width slide; drill deeper left, back right.
 */
export const SHEET_STACK_PUSH_DURATION = 450;

/**
 * In-sheet stack push curve — content ease, not the sheet dismiss curve.
 */
export const SHEET_STACK_PUSH_EASING = SHEET_STACK_CONTENT_EASING;

/**
 * Incoming screen opacity: 0.22s easeOut, delayed 0.05s.
 */
export const SHEET_STACK_OPACITY_IN_DURATION = 220;
export const SHEET_STACK_OPACITY_IN_DELAY = 50;

/**
 * Outgoing screen opacity: 0.08s easeIn (vanishes before the new screen lands).
 */
export const SHEET_STACK_OPACITY_OUT_DURATION = 80;

/**
 * In-sheet content height resize — same 0.45s content ease as the slide
 * so height and X move as one gesture (no layout-spring bounce).
 */
export const SHEET_STACK_HEIGHT_DURATION = 450;

/**
 * Height resize expo-out curve: [0.16, 1, 0.3, 1].
 */
export const SHEET_STACK_HEIGHT_EASING = SHEET_STACK_CONTENT_EASING;
