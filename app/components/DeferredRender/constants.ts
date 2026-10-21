/** Backup delay for one deferred frame when rAF or idle never runs. */
export const DEFERRED_RENDER_FRAME_TIMEOUT_MS = 100;

/** Default placeholder testID prefix. Stage slots append `-${stage}`. */
export const DEFERRED_RENDER_PLACEHOLDER_TEST_ID =
  'deferred-render-placeholder';

/**
 * User Timing mark recorded on the deferred host's first commit.
 * Measure from this mark to {@link deferredRenderCompleteMark} for
 * first-render → deferred-ready on that screen.
 */
export function deferredRenderFirstRenderMark(screenId: string): string {
  return `deferred-render:${screenId}:first-render`;
}

/**
 * User Timing mark recorded once per visit, when the last deferred stage
 * is released.
 */
export function deferredRenderCompleteMark(screenId: string): string {
  return `deferred-render:${screenId}:complete`;
}

/** Placeholder testID for a staged slot. Stage 0 is `…-placeholder-0`. */
export function deferredRenderPlaceholderTestId(stage = 0): string {
  return `${DEFERRED_RENDER_PLACEHOLDER_TEST_ID}-${stage}`;
}
