/**
 * In-sheet stack motion tokens — mirrored from design-system BottomSheetDialog
 * (replit/bottom-sheet / PR #1411) for Quick Buy only until the package ships them.
 *
 * Springs are only for interactive settle (open, snap-back).
 * Surface exits and content nav use tweens on the two iOS curves.
 */

/**
 * Content / surface ease — easeOutExpo-style: [0.16, 1, 0.3, 1].
 */
export const SHEET_STACK_CONTENT_EASING = [0.16, 1, 0.3, 1] as const;

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
