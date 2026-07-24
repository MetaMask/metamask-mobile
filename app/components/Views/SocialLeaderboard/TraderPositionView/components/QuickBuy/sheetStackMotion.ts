/**
 * Sheet / stack / backdrop motion tokens — mirrored from design-system
 * BottomSheetDialog + BottomSheetOverlay (replit/bottom-sheet / PR #1411)
 * for Quick Buy only until the package ships them.
 *
 * Springs are only for interactive settle (open, snap-back).
 * Surface exits and content nav use tweens on the two iOS curves.
 */

/**
 * Content / surface ease — easeOutExpo-style: [0.16, 1, 0.3, 1].
 */
export const SHEET_STACK_CONTENT_EASING = [0.16, 1, 0.3, 1] as const;

/**
 * Backdrop open duration in ms — match installed BottomSheetDialog open
 * (`AnimationDuration.Fast` = 150). Keeps scrim and sheet Y in sync; bump
 * with the DS sheet when PR #1411 ships a longer open.
 */
export const OVERLAY_OPEN_DURATION = 150;

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
