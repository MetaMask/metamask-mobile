import { Performance } from '.';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';

/**
 * Owns the two startup spans whose start and end live in different files.
 *
 * Both are once-per-launch measurements, so the guards are module-scoped: a
 * remount must not reopen a span, and a repeated native `onLayout` must not
 * close one twice.
 */
let postInitGapOpen = false;
let postInitGapClosed = false;
let unlockInteractiveClosed = false;

/**
 * Opens the window between `Engine.init()` finishing and the navigator's first
 * render.
 *
 * Nothing the user can see happens here, which is exactly why it needs a span:
 * it is where fire-and-forget startup work lands. It measured 1,102 ms before
 * a single call site (4,107 `new URL()` parses for analytics labelling) was
 * fixed, and 152 ms after. A regression of that class is otherwise invisible,
 * because it sits between two spans rather than inside either.
 */
export function startPostInitGap(): void {
  if (postInitGapOpen) {
    return;
  }
  postInitGapOpen = true;
  trace({
    name: TraceName.PostInitGap,
    op: TraceOperation.UIStartup,
  });
}

/** Closes the post-init window when the navigator first renders. */
export function endPostInitGap(): void {
  if (!postInitGapOpen || postInitGapClosed) {
    return;
  }
  postInitGapClosed = true;
  endTrace({ name: TraceName.PostInitGap });
}

/**
 * Opens the app-start-to-unlock-interactive CUF, anchored on the native launch
 * timestamp so it covers the same window the user experiences.
 *
 * `UIStartup` ends at `App`'s first render, and `HomepageReady` only starts at
 * unlock submit on the locked path, so for a locked cold start — the common
 * case — nothing measures the wait before the user can even begin typing.
 */
export function startAppStartToUnlockInteractive(): void {
  trace({
    name: TraceName.AppStartToUnlockInteractive,
    op: TraceOperation.UIStartup,
    startTime: Performance.appLaunchTime,
  });
}

/**
 * Closes the CUF the first time the password field reports native layout.
 *
 * Anchored on layout rather than mount or an effect: those fire before the
 * field can accept input and would measure close to zero. Measured on a
 * Galaxy A14, the field became interactive 1,402 ms before it was visible.
 */
export function endAppStartToUnlockInteractive(): void {
  if (unlockInteractiveClosed) {
    return;
  }
  unlockInteractiveClosed = true;
  endTrace({ name: TraceName.AppStartToUnlockInteractive });
}

/** @internal Reset between tests. Do not call in production code. */
export function resetStartupStageSpansForTesting(): void {
  postInitGapOpen = false;
  postInitGapClosed = false;
  unlockInteractiveClosed = false;
}
