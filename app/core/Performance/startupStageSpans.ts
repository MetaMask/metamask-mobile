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
let unlockLaidOutClosed = false;

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
 * Opens the app-start-to-unlock-laid-out CUF, anchored on the native launch
 * timestamp so it covers the same window the user experiences.
 *
 * `UIStartup` ends at `App`'s first render, and `HomepageReady` only starts at
 * unlock submit on the locked path, so for a locked cold start — the common
 * case — nothing measures the wait before the user can even begin typing.
 */
export function startAppStartToUnlockLaidOut(): void {
  trace({
    name: TraceName.AppStartToUnlockLaidOut,
    op: TraceOperation.UIStartup,
    startTime: Performance.appLaunchTime,
  });
}

/**
 * Closes the CUF the first time the password field reports native layout.
 *
 * Anchored on layout rather than mount or an effect: those fire before the
 * field can accept input and would measure close to zero.
 *
 * This is the moment the field *works*, not the moment it is *visible* — on a
 * Galaxy A14 the splash covered it for a further 1,402 ms. That gap is
 * deliberately left in `SplashRevealTax` rather than folded in here, so the two
 * are separable; a single "user can unlock" number would hide it.
 */
export function endAppStartToUnlockLaidOut(): void {
  if (unlockLaidOutClosed) {
    return;
  }
  unlockLaidOutClosed = true;
  endTrace({ name: TraceName.AppStartToUnlockLaidOut });
}

/** @internal Reset between tests. Do not call in production code. */
export function resetStartupStageSpansForTesting(): void {
  postInitGapOpen = false;
  postInitGapClosed = false;
  unlockLaidOutClosed = false;
}
