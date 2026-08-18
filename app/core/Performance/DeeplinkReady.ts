import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
  TRACES_CLEANUP_INTERVAL,
} from '../../util/trace';
import { AppStateEventProcessor } from '../AppStateEventListener';

/**
 * Deeplink Ready CUF — opening a deeplink while the app is closed, through to
 * the destination showing usable content.
 *
 * Sibling of {@link ./HomepageReady}, which measures the same launch for users
 * who land on Home. The two are mutually exclusive by construction: a cold
 * launch that navigates elsewhere is discarded by
 * `resolveColdHomepageReadyTrace({ isHomepageFocused: false })`.
 *
 * The unlock wait is excluded the same way Homepage Ready excludes it — the span
 * starts at unlock submit rather than at process start, so the measurement stays
 * machine time. Which entry point opened it is recorded as `start_source`.
 *
 * `app_open` (backdating to `Performance.appLaunchTime`) is intentionally not
 * wired up. A cold launch always finds the vault locked by the time
 * `SharedDeeplinkManager.start()` runs, so the only launches that would take that
 * path are ones where Branch delivers the link *after* a manual unlock — where
 * backdating would swallow the password wait, the exact thing this design
 * excludes. Adding it back means mirroring Homepage Ready's queue/resolve pair
 * (`queueColdHomepageReadyTrace` / `resolveColdHomepageReadyTrace`), not a
 * one-line call. The trade-off is that a late-delivered deeplink goes
 * unmeasured; under-measuring beats reporting a number inflated by human wait.
 *
 * Abandoned flows are deliberately left open rather than ended on a timer: the
 * State of Quality query is `is_transaction:true transaction:"..."` with no
 * `success` filter, so a span ended at an artificial timeout would be counted in
 * the reported p90. `TRACES_CLEANUP_INTERVAL` marks those spans `trace.timed_out`
 * and Sentry's `beforeSendTransaction` drops them.
 */

export type DeeplinkReadyContentState = 'filled' | 'empty' | 'error';
export type DeeplinkReadyStartSource = 'app_open' | 'unlock';
export type DeeplinkReadyAppStartType = 'cold' | 'warm';
export type DeeplinkReadyTraceToken = number;

/**
 * Routes whose destination screen calls {@link endDeeplinkReadyTrace}.
 *
 * Starting the span for a route with no content marker would leave every one of
 * its opens to expire unrecorded. Add a route here in the same change that adds
 * its marker, never before.
 */
const INSTRUMENTED_ROUTES = new Set<string>(['trending']);

interface StartDeeplinkReadyTraceOptions {
  source: DeeplinkReadyStartSource;
  appStartType: DeeplinkReadyAppStartType;
  startTime?: number;
}

interface EndDeeplinkReadyTraceOptions {
  route: string;
  contentState: DeeplinkReadyContentState;
}

interface CancelDeeplinkReadyTraceOptions {
  reason: 'unlock_failed' | 'rejected' | 'unresolved' | 'error';
  traceToken?: DeeplinkReadyTraceToken | null;
}

let startedAt: number | null = null;
let activeTraceToken: DeeplinkReadyTraceToken | null = null;
let activeRoute: string | null = null;
let nextTraceToken = 0;

/**
 * The action segment of the pending deeplink, when it is one we measure.
 * `https://link.metamask.io/trending?tab=crypto` and `metamask://trending` both
 * resolve to `trending`.
 */
const pendingInstrumentedRoute = (): string | null => {
  const uri = AppStateEventProcessor.pendingDeeplink;
  if (!uri) {
    return null;
  }

  try {
    const url = new URL(uri);
    // Custom-scheme links carry the action as the host rather than the path.
    const route = url.pathname.split('/')[1] || url.hostname;
    return route && INSTRUMENTED_ROUTES.has(route) ? route : null;
  } catch {
    return null;
  }
};

/**
 * Returns whether an entry point has already started the Deeplink Ready CUF.
 */
export const isDeeplinkReadyTraceActive = () => startedAt !== null;

/**
 * Starts the deeplink-to-content CUF, if the launch is one we measure.
 *
 * No-ops unless the app is still in the session it launched in and a pending
 * deeplink targets an instrumented route. The in-flight guard lets the unlock
 * and app-open entry points both call this without replacing each other's span,
 * matching `startHomepageReadyTrace`.
 */
export const startDeeplinkReadyTrace = ({
  source,
  appStartType,
  startTime,
}: StartDeeplinkReadyTraceOptions): DeeplinkReadyTraceToken | null => {
  if (!AppStateEventProcessor.isColdStartSession) {
    return null;
  }

  const route = pendingInstrumentedRoute();
  if (route === null) {
    return null;
  }

  const now = Date.now();
  if (startedAt !== null && now - startedAt < TRACES_CLEANUP_INTERVAL) {
    return null;
  }

  startedAt = now;
  activeRoute = route;
  nextTraceToken += 1;
  activeTraceToken = nextTraceToken;
  trace({
    name: TraceName.DeeplinkReady,
    op: TraceOperation.DeeplinkPerformance,
    ...(startTime === undefined ? {} : { startTime }),
    // `UI Startup` is still open at this point in a cold launch, so the span
    // has to be forced into its own trace to be queryable as a transaction.
    forceTransaction: true,
    tags: {
      start_source: source,
      app_start_type: appStartType,
      deeplink_route: route,
    },
  });
  return activeTraceToken;
};

/**
 * Ends the CUF once the deeplink destination has rendered a usable filled,
 * empty, or error state.
 *
 * Call this on data having settled, never on mount — a condition already true on
 * the first render closes the span at ~0 ms and reads as a perfect score.
 *
 * @param route - The destination's route, matched against the one that opened
 * the span so a later in-app navigation cannot close another route's flow.
 */
export const endDeeplinkReadyTrace = ({
  route,
  contentState,
}: EndDeeplinkReadyTraceOptions) => {
  if (startedAt === null || route !== activeRoute) {
    return;
  }

  endTrace({
    name: TraceName.DeeplinkReady,
    data: {
      success: contentState !== 'error',
      content_state: contentState,
      deeplink_route: route,
    },
  });
  startedAt = null;
  activeTraceToken = null;
  activeRoute = null;
};

/**
 * Ends an in-flight CUF that cannot reach the destination — a failed unlock, or
 * a deeplink the app declined to act on.
 *
 * Releasing the guard matters as much as the span: a retry has to start from its
 * own entry point rather than inheriting time from the failed attempt.
 *
 * @param traceToken - When given, the cancel only applies to that span. Omit it
 * for terminal failures that are not tied to a specific entry point.
 */
export const cancelDeeplinkReadyTrace = ({
  reason,
  traceToken,
}: CancelDeeplinkReadyTraceOptions) => {
  if (startedAt === null) {
    return;
  }

  if (traceToken !== undefined && traceToken !== activeTraceToken) {
    return;
  }

  endTrace({
    name: TraceName.DeeplinkReady,
    data: {
      success: false,
      reason,
      ...(activeRoute === null ? {} : { deeplink_route: activeRoute }),
    },
  });
  startedAt = null;
  activeTraceToken = null;
  activeRoute = null;
};

export const resetDeeplinkReadyTraceForTesting = () => {
  startedAt = null;
  activeTraceToken = null;
  activeRoute = null;
  nextTraceToken = 0;
};
