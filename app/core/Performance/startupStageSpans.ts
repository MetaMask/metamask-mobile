import { Performance } from '.';
import Logger from '../../util/Logger';
import getUIStartupSpan from './UIStartup';
import { endTrace, trace, TraceName, TraceOperation } from '../../util/trace';

/**
 * Owns the startup spans whose start and end live in different files, so that
 * every one of them carries the same two properties rather than each call site
 * re-deriving them.
 *
 * **Once per launch.** These measure a launch, not a mount, so the guards are
 * module-scoped: a remount must not reopen a span, a repeated native `onLayout`
 * must not close one twice, and closing a span that never opened must be a
 * no-op (an unmatched `endTrace` would emit a bogus start).
 *
 * **Never changes control flow.** See `safely`.
 */
let postInitGapOpen = false;
let postInitGapClosed = false;
let unlockLaidOutOpen = false;
let unlockLaidOutClosed = false;
let splashRevealOpen = false;
let splashRevealClosed = false;
let rehydrationOpen = false;
let rehydrationClosed = false;
let rootNavigatorRenderOpen = false;
let rootNavigatorRenderClosed = false;

/**
 * Runs a tracing call so that it cannot alter the behaviour it measures.
 *
 * Every span here sits on the critical path: the rehydration span opens
 * immediately before `getAllPersistedState()`, and the splash span closes inside
 * the fade callback that reveals the UI. Without this, a throw from the tracing
 * layer — `getTraceTags` reads Redux state, so malformed state is enough — would
 * either abort `EngineService.start()` (no Engine, splash forever) or strand the
 * splash overlay on screen permanently.
 *
 * A lost measurement is an acceptable outcome. A wallet that will not start is
 * not.
 */
function safely(operation: () => void): void {
  try {
    operation();
  } catch (error) {
    Logger.error(error as Error, 'startupStageSpans: tracing call failed');
  }
}

/**
 * Opens the span covering the filesystem reads and `JSON.parse` of every
 * `persist:<Controller>` blob, before a single controller is constructed.
 *
 * Spanned separately from `Engine.init()` so startup can be told apart as
 * I/O-bound or CPU-bound here.
 */
export function startControllerStateRehydration(): void {
  if (rehydrationOpen) {
    return;
  }
  rehydrationOpen = true;
  safely(() =>
    trace({
      name: TraceName.ControllerStateRehydration,
      op: TraceOperation.StorageRehydration,
      parentContext: getUIStartupSpan(),
    }),
  );
}

/** Closes the rehydration span once persisted state has been read and parsed. */
export function endControllerStateRehydration(): void {
  if (!rehydrationOpen || rehydrationClosed) {
    return;
  }
  rehydrationClosed = true;
  safely(() => endTrace({ name: TraceName.ControllerStateRehydration }));
}

/**
 * Opens the window between the `EngineInitialization` span ending and the
 * navigator's first render.
 *
 * Note the boundary is the end of that *span* — which covers `Engine.init()`
 * **and** `initializeControllers()` — not the return of the `Engine.init()` call
 * itself. Starting it any earlier would overlap `EngineInitialization` and
 * double-count `initializeControllers` across two spans; as placed, the ladder
 * has neither a gap nor an overlap.
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
  safely(() =>
    trace({
      name: TraceName.PostInitGap,
      op: TraceOperation.UIStartup,
      // Parented like its siblings, and it is safe to do so: `App` renders only
      // once `appServicesReady` flips, and `AppFlow` is its child, so
      // `endPostInitGap` (AppFlow's mount effect) runs before `UIStartup` ends
      // (App's mount effect). Without a parent this would be a root
      // transaction — sampled independently, missing from the `UIStartup` tree,
      // and dropped by `excludeEvents` if it ever timed out instead of being
      // kept as a child carrying `trace.timed_out`.
      parentContext: getUIStartupSpan(),
    }),
  );
}

/** Closes the post-init window when the navigator first renders. */
export function endPostInitGap(): void {
  if (!postInitGapOpen || postInitGapClosed) {
    return;
  }
  postInitGapClosed = true;
  safely(() => endTrace({ name: TraceName.PostInitGap }));
}

/**
 * Opens the span covering `AppFlow`'s first render — the synchronous navigator
 * module-evaluation burst.
 *
 * Called from a lazy `useState` initialiser, i.e. during render, because that is
 * the only point before children evaluate; every effect fires after the burst
 * has already happened. That makes throw-safety load-bearing rather than
 * defensive: an unguarded throw here would propagate out of `AppFlow`'s render
 * and take the navigator down with it, turning a lost measurement into a blank
 * app.
 */
export function startRootNavigatorFirstRender(): void {
  if (rootNavigatorRenderOpen) {
    return;
  }
  rootNavigatorRenderOpen = true;
  safely(() =>
    trace({
      name: TraceName.RootNavigatorFirstRender,
      op: TraceOperation.UIStartup,
      parentContext: getUIStartupSpan(),
    }),
  );
}

/**
 * Closes the navigator-render span from `AppFlow`'s mount effect.
 *
 * Its caller also closes `PostInitGap`, so a throw escaping here would skip
 * that and leave `PostInitGap` to time out.
 */
export function endRootNavigatorFirstRender(): void {
  if (!rootNavigatorRenderOpen || rootNavigatorRenderClosed) {
    return;
  }
  rootNavigatorRenderClosed = true;
  safely(() => endTrace({ name: TraceName.RootNavigatorFirstRender }));
}

/**
 * Opens the splash reveal-tax span the moment the gate unblocks.
 *
 * Neither `UIStartup` (ends at `App`'s first render) nor Sentry's
 * `app_start_cold` (ends at root mount) covers this window, so without an
 * explicit span the fixed animation + fade budget is invisible to every shipped
 * metric.
 *
 * Guarded because `trace()` replaces a pending span that shares its key by
 * finishing the previous one at a capped timestamp — so an unguarded remount
 * would emit a spurious span rather than being harmless.
 */
export function startSplashRevealTax(): void {
  if (splashRevealOpen) {
    return;
  }
  splashRevealOpen = true;
  safely(() =>
    trace({
      name: TraceName.SplashRevealTax,
      op: TraceOperation.UIStartup,
      // `UI Startup` is still open at `appServicesReady` — it does not end
      // until `App`'s mount effect, which runs after the gate unblocks. Without
      // this the span would be absorbed into that trace instead of being
      // queryable on its own, which is the whole point of keeping it separate
      // from the unlock CUF. Same reason as `DeeplinkPerformance`.
      forceTransaction: true,
    }),
  );
}

/**
 * Closes the reveal-tax span once the splash overlay has actually gone.
 *
 * Children have been rendering underneath since `appServicesReady` flipped, so
 * everything in this window is perceived latency the user pays with nothing to
 * show for it.
 */
export function endSplashRevealTax(): void {
  if (!splashRevealOpen || splashRevealClosed) {
    return;
  }
  splashRevealClosed = true;
  safely(() => endTrace({ name: TraceName.SplashRevealTax }));
}

/**
 * Opens the app-start-to-unlock-laid-out CUF, anchored on the native launch
 * timestamp so it covers the same window the user experiences.
 *
 * `UIStartup` ends at `App`'s first render, and `HomepageReady` only starts at
 * unlock submit on the locked path, so for a locked cold start — the common
 * case — nothing measures the wait before the user can even begin typing.
 *
 * Opens at most once per launch. The span is anchored on process start, so a
 * second open after a mid-session re-lock would measure the whole session; the
 * caller is also expected not to ask (see `App.tsx`), but the guard makes the
 * bad value unreachable rather than merely unlikely.
 */
export function startAppStartToUnlockLaidOut(): void {
  if (unlockLaidOutOpen) {
    return;
  }
  unlockLaidOutOpen = true;
  safely(() =>
    trace({
      name: TraceName.AppStartToUnlockLaidOut,
      op: TraceOperation.UIStartup,
      startTime: Performance.appLaunchTime,
      // A top-level CUF, so it must be its own transaction rather than a span
      // hanging off whatever trace happens to be open. `HomepageReady` gets
      // away without this because it starts at unlock submit, long after
      // `UI Startup` has ended; this one can start while it is still live.
      forceTransaction: true,
    }),
  );
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
  if (!unlockLaidOutOpen || unlockLaidOutClosed) {
    return;
  }
  unlockLaidOutClosed = true;
  safely(() => endTrace({ name: TraceName.AppStartToUnlockLaidOut }));
}

/** @internal Reset between tests. Do not call in production code. */
export function resetStartupStageSpansForTesting(): void {
  postInitGapOpen = false;
  postInitGapClosed = false;
  unlockLaidOutOpen = false;
  unlockLaidOutClosed = false;
  splashRevealOpen = false;
  splashRevealClosed = false;
  rehydrationOpen = false;
  rehydrationClosed = false;
  rootNavigatorRenderOpen = false;
  rootNavigatorRenderClosed = false;
}
