import {
  endTrace,
  trace,
  type TraceContext,
  TraceName,
  TraceOperation,
  TRACES_CLEANUP_INTERVAL,
} from '../../util/trace';

/**
 * Deeplink Processed + Deeplink Navigated CUFs.
 *
 * Processed measures app-side link processing: from `DeeplinkManager.parse` /
 * `.resolve` entry until immediately before navigation. It fires for every
 * deeplink and needs no destination cooperation, unlike Deeplink Ready.
 *
 * Navigated measures unlock submit or link intake until the
 * navigation state commits on the target route. That is "navigation
 * committed", not "pixels on screen" — the startup saga burns an explicit
 * requestAnimationFrame for exactly that gap. First paint is per-route work
 * (Deeplink Ready).
 *
 * Neither span measures human wait. The interstitial modal splits Processed
 * into `before_gate` / `after_gate` segments so the user's reaction time is a
 * hole between spans rather than noise inside one, and Navigated starts at
 * unlock submit so the password dwell is excluded.
 *
 * Abandoned flows are deliberately left open rather than ended on a timer:
 * `TRACES_CLEANUP_INTERVAL` marks those `trace.timed_out` and
 * `beforeSendTransaction` drops them.
 */

export type DeeplinkPerfStartSource = 'unlock' | 'intake';
export type DeeplinkPerfAppStartType = 'cold' | 'warm';
export type DeeplinkProcessedSeam = 'pre_navigate' | 'handler_finished';
export type DeeplinkTraceToken = number;

export type DeeplinkProcessedCancelReason =
  | 'rejected'
  | 'unresolved'
  | 'error'
  | 'interstitial_rejected';
export type DeeplinkNavigatedCancelReason =
  | DeeplinkProcessedCancelReason
  | 'unlock_failed';

interface DeeplinkUrlTags {
  deeplink_route: string;
  deeplink_variant: string;
  signed: boolean;
}

interface StartDeeplinkTraceOptions {
  url: string;
  source: DeeplinkPerfStartSource;
  appStartType: DeeplinkPerfAppStartType;
  startTime?: number;
}

/**
 * A variant that is safe to use as a Sentry tag value. Values come from the
 * URL, so anything outside this shape is treated as `default` — which is also
 * where navigation lands, since the route schemas drop values they do not
 * accept.
 */
const VARIANT_PATTERN = /^[a-z][a-z-]{0,23}$/;

/**
 * Links that are handled but never navigate: no destination means Navigated
 * could never close. Routes cover universal-link actions, protocols cover the
 * raw schemes before they are rewritten to universal form.
 */
const NEVER_NAVIGATING_ROUTES = new Set(['wc', 'bind', 'connect', 'mmsdk']);
const NEVER_NAVIGATING_PROTOCOLS = new Set(['wc:', 'ethereum:']);

/**
 * The action segment of a deeplink and the variant it asks for. Both
 * `https://link.metamask.io/trending?tab=crypto` and `metamask://trending`
 * resolve to route `trending`, with variants `crypto` and `default`.
 * Unparseable URLs report `unknown` so error paths stay measured.
 */
export const deeplinkUrlTags = (uri: string): DeeplinkUrlTags => {
  try {
    const url = new URL(uri);
    // Custom-scheme links carry the action as the host rather than the path.
    const route = url.pathname.split('/')[1] || url.hostname || 'unknown';
    const variant =
      url.searchParams.get('screen') ?? url.searchParams.get('tab') ?? '';
    return {
      deeplink_route: route,
      deeplink_variant: VARIANT_PATTERN.test(variant) ? variant : 'default',
      signed: url.searchParams.has('sig'),
    };
  } catch {
    return {
      deeplink_route: 'unknown',
      deeplink_variant: 'default',
      signed: false,
    };
  }
};

const neverNavigates = (uri: string): boolean => {
  try {
    const url = new URL(uri);
    return (
      NEVER_NAVIGATING_PROTOCOLS.has(url.protocol) ||
      NEVER_NAVIGATING_ROUTES.has(deeplinkUrlTags(uri).deeplink_route)
    );
  } catch {
    return true;
  }
};

/**
 * `single`: one uninterrupted span (interstitial skipped).
 * `awaiting_continue`: the `before_gate` segment ended when the modal was
 * shown; no span is open while the user decides.
 * `after_gate`: the second segment runs from the continue tap.
 */
type ProcessedPhase = 'single' | 'awaiting_continue' | 'after_gate';

interface ProcessedState {
  token: DeeplinkTraceToken;
  startedAt: number;
  phase: ProcessedPhase;
  urlTags: DeeplinkUrlTags;
  source: DeeplinkPerfStartSource;
  appStartType: DeeplinkPerfAppStartType;
  spanContext: TraceContext;
}

interface NavigatedState {
  token: DeeplinkTraceToken;
  startedAt: number;
  targetRoute: string | null;
}

let processed: ProcessedState | null = null;
let navigated: NavigatedState | null = null;
/** When Processed last closed; the inferred Navigated end keys off this. */
let processedEndedAt: number | null = null;
let nextTraceToken = 0;

const processedTags = (state: ProcessedState) => ({
  ...state.urlTags,
  start_source: state.source,
  app_start_type: state.appStartType,
});

/**
 * Parent context for stage-attribution child spans (signature verify, intent
 * prepare). `undefined` while no Processed span is open — callers skip the
 * child span rather than emit an orphan root.
 */
export const getDeeplinkProcessedTraceContext = (): TraceContext =>
  processed?.phase === 'awaiting_continue' ? undefined : processed?.spanContext;

/**
 * Starts the Processed span at `DeeplinkManager.parse`/`.resolve` entry. The
 * in-flight guard makes the recursive `parse` calls (send, wc) no-ops instead
 * of replacing the outer span.
 */
export const startDeeplinkProcessedTrace = ({
  url,
  source,
  appStartType,
  startTime,
}: StartDeeplinkTraceOptions): DeeplinkTraceToken | null => {
  const now = Date.now();
  if (
    processed !== null &&
    now - processed.startedAt < TRACES_CLEANUP_INTERVAL
  ) {
    return null;
  }

  nextTraceToken += 1;
  processed = {
    token: nextTraceToken,
    startedAt: now,
    phase: 'single',
    urlTags: deeplinkUrlTags(url),
    source,
    appStartType,
    spanContext: undefined,
  };
  processed.spanContext = trace({
    name: TraceName.DeeplinkProcessed,
    op: TraceOperation.DeeplinkPerformance,
    ...(startTime === undefined ? {} : { startTime }),
    // `UI Startup` is still open in a cold launch, so force our own trace to
    // stay queryable as a transaction.
    forceTransaction: true,
    tags: processedTags(processed),
  });
  return processed.token;
};

/**
 * Ends the `before_gate` segment the moment the interstitial is presented.
 * The user's dwell on the modal is deliberately a hole between segments
 */
export const markDeeplinkInterstitialShown = () => {
  if (processed === null || processed.phase !== 'single') {
    return;
  }

  endTrace({
    name: TraceName.DeeplinkProcessed,
    data: {
      success: true,
      segment: 'before_gate',
      interstitial: 'shown',
    },
  });
  processed.phase = 'awaiting_continue';
  processed.spanContext = undefined;
};

/** Starts the `after_gate` segment from the continue tap. */
export const markDeeplinkInterstitialContinued = () => {
  if (processed === null || processed.phase !== 'awaiting_continue') {
    return;
  }

  processed.phase = 'after_gate';
  processed.startedAt = Date.now();
  processed.spanContext = trace({
    name: TraceName.DeeplinkProcessed,
    op: TraceOperation.DeeplinkPerformance,
    forceTransaction: true,
    tags: {
      ...processedTags(processed),
      segment: 'after_gate',
      interstitial: 'shown',
    },
  });
};

/**
 * Ends Processed at one of two seams. `pre_navigate` (intent handlers, after
 * `intent.prepare()`) is exact; `handler_finished` (everything else) includes the
 * handler's own navigate call. The tag makes the imprecision explicit — as
 * handlers migrate to intents they graduate seams with no telemetry change.
 */
export const endDeeplinkProcessedTrace = ({
  seam,
  targetRoute,
}: {
  seam: DeeplinkProcessedSeam;
  targetRoute?: string;
}) => {
  if (processed === null || processed.phase === 'awaiting_continue') {
    return;
  }

  endTrace({
    name: TraceName.DeeplinkProcessed,
    data: {
      success: true,
      seam,
      segment: processed.phase === 'after_gate' ? 'after_gate' : 'full',
      interstitial: processed.phase === 'after_gate' ? 'shown' : 'skipped',
      ...(targetRoute === undefined ? {} : { target_route: targetRoute }),
    },
  });
  processed = null;
  processedEndedAt = Date.now();
};

/**
 * Ends an in-flight Navigated span that cannot reach a destination. Releasing
 * the guard matters as much as the span: a retry has to start from its own
 * entry point rather than inheriting time from the failed attempt.
 *
 * @param traceToken - When given, the cancel only applies to that span. Omit
 * it for terminal failures that are not tied to a specific entry point.
 */
export const cancelDeeplinkNavigatedTrace = ({
  reason,
  traceToken,
}: {
  reason: DeeplinkNavigatedCancelReason;
  traceToken?: DeeplinkTraceToken | null;
}) => {
  if (navigated === null) {
    return;
  }
  if (traceToken !== undefined && traceToken !== navigated.token) {
    return;
  }

  endTrace({
    name: TraceName.DeeplinkNavigated,
    data: {
      success: false,
      reason,
    },
  });
  navigated = null;
  processedEndedAt = null;
};

/**
 * Ends a Processed flow that will not reach navigation, and cancels the
 * Navigated span with it — a link that goes nowhere must not leave Navigated
 * waiting on a state change that never comes. A rejection while the modal is
 * up has no open span (the `before_gate` segment already closed as a valid
 * measurement); only the state is released.
 */
export const cancelDeeplinkProcessedTrace = ({
  reason,
}: {
  reason: DeeplinkProcessedCancelReason;
}) => {
  if (processed === null) {
    return;
  }

  const effectiveReason =
    processed.phase === 'awaiting_continue' ? 'interstitial_rejected' : reason;
  if (processed.phase !== 'awaiting_continue') {
    endTrace({
      name: TraceName.DeeplinkProcessed,
      data: {
        success: false,
        reason: effectiveReason,
        segment: processed.phase === 'after_gate' ? 'after_gate' : 'full',
      },
    });
  }
  processed = null;
  processedEndedAt = null;
  cancelDeeplinkNavigatedTrace({ reason: effectiveReason });
};

/**
 * Starts the Navigated span: unlock submit on cold start, link intake when
 * already unlocked. No-ops for links that never navigate, and the in-flight
 * guard lets the unlock entry points and the startup fallback both call this
 * without replacing each other's span.
 */
export const startDeeplinkNavigatedTrace = ({
  url,
  source,
  appStartType,
  startTime,
}: StartDeeplinkTraceOptions): DeeplinkTraceToken | null => {
  const now = Date.now();
  if (
    navigated !== null &&
    now - navigated.startedAt < TRACES_CLEANUP_INTERVAL
  ) {
    return null;
  }
  if (neverNavigates(url)) {
    return null;
  }

  nextTraceToken += 1;
  navigated = {
    token: nextTraceToken,
    startedAt: now,
    targetRoute: null,
  };
  processedEndedAt = null;
  trace({
    name: TraceName.DeeplinkNavigated,
    op: TraceOperation.DeeplinkPerformance,
    ...(startTime === undefined ? {} : { startTime }),
    forceTransaction: true,
    tags: {
      ...deeplinkUrlTags(url),
      start_source: source,
      app_start_type: appStartType,
    },
  });
  return navigated.token;
};

/**
 * Records the resolved destination once the intent is known, upgrading the
 * Navigated end condition from inferred (first route change after Processed
 * ends) to an exact focused-route match.
 */
export const resolveDeeplinkNavigatedTarget = ({
  targetRoute,
}: {
  targetRoute: string;
}) => {
  if (navigated === null) {
    return;
  }
  navigated.targetRoute = targetRoute;
};

/**
 * Ends Navigated from the navigation container's `onStateChange`. With a known
 * target the whole focused chain is matched, not just the leaf — nested
 * navigators focus a child screen of the intent's route. Without one
 * (`immediate/` handlers navigate themselves, so no intent exists), the first
 * commit after Processed ended closes the span; `nav_target: inferred` keeps
 * that lower-confidence subset filterable.
 */
export const handleDeeplinkNavigationStateChange = ({
  focusedRouteNames,
}: {
  focusedRouteNames: string[];
}) => {
  if (navigated === null) {
    return;
  }

  const focusedRoute = focusedRouteNames[focusedRouteNames.length - 1] ?? '';
  if (navigated.targetRoute !== null) {
    if (!focusedRouteNames.includes(navigated.targetRoute)) {
      return;
    }
    endTrace({
      name: TraceName.DeeplinkNavigated,
      data: {
        success: true,
        nav_target: 'known',
        target_route: navigated.targetRoute,
        focused_route: focusedRoute,
      },
    });
  } else {
    if (processedEndedAt === null || processedEndedAt < navigated.startedAt) {
      return;
    }
    endTrace({
      name: TraceName.DeeplinkNavigated,
      data: {
        success: true,
        nav_target: 'inferred',
        focused_route: focusedRoute,
      },
    });
  }
  navigated = null;
  processedEndedAt = null;
};

export const resetDeeplinkPerformanceForTesting = () => {
  processed = null;
  navigated = null;
  processedEndedAt = null;
  nextTraceToken = 0;
};
