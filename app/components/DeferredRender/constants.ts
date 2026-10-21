/** Backup delay for a later stage that only waits for one animation frame. */
export const DEFERRED_RENDER_FRAME_TIMEOUT_MS = 100;

/**
 * Backup delay for the first stage. That stage waits for one animation frame
 * and then an idle callback. The timer starts when the stage is scheduled,
 * before `requestAnimationFrame`, so it has to cover both.
 */
export const DEFERRED_RENDER_FIRST_STAGE_TIMEOUT_MS = 250;

/** Default placeholder testID prefix. Stage slots append `-${stage}`. */
export const DEFERRED_RENDER_PLACEHOLDER_TEST_ID =
  'deferred-render-placeholder';

/**
 * User Timing mark recorded on the deferred host's first commit.
 * Measure from this mark to {@link deferredRenderCompleteMark} for
 * first commit → deferred children committed on that screen.
 */
export function deferredRenderFirstRenderMark(screenId: string): string {
  return `deferred-render:${screenId}:first-render`;
}

/**
 * User Timing mark recorded once per visit, after the last deferred
 * stage's children have committed.
 */
export function deferredRenderCompleteMark(screenId: string): string {
  return `deferred-render:${screenId}:complete`;
}

/** Placeholder testID for a staged slot. Stage 0 is `…-placeholder-0`. */
export function deferredRenderPlaceholderTestId(stage = 0): string {
  return `${DEFERRED_RENDER_PLACEHOLDER_TEST_ID}-${stage}`;
}
