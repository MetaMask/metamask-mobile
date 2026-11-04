/**
 * JS side of the always-on perf sampler (`MetaMaskPerfSession` Android native
 * module). Reports the focused screen, and about once a second sends the native
 * sampler what only JS can see: completed `trace()` spans, the JS event-loop lag
 * and Redux action counts. Wire format: perf-collector CONTRACT.md (v3).
 *
 * The module lives in `android/app/src/main/java/io/metamask/nativeModules/PerfSession`
 * and is only registered in builds with `MM_PERF_SESSION_URL` set (builds.yml
 * entries that merge `*perf_session`, e.g. `main-exp`), so on every other build
 * and on iOS everything here is a no-op.
 *
 * Which of these are collected is decided by the collector at runtime: each report
 * resolves with the enabled features, and disabled probes stop. Until the first
 * answer, spans and Redux counts are kept (bounded) so startup isn't missed; the
 * native side drops them if the collector turns them off.
 * See `docs/performance/perf-sessions.md`.
 */

import { NativeModules } from 'react-native';
import type { Middleware } from 'redux';

interface PerfSessionNativeModule {
  setScreen(name: string): void;
  report?(json: string): Promise<string>;
  setManualProfiling?(active: boolean): void;
}

interface JsFeatures {
  spans: boolean;
  redux: boolean;
  jsLag: boolean;
}

interface CompletedSpan {
  name: string;
  id?: string;
  t: number;
  durationMs: number;
  status?: 'ok' | 'error';
}

interface OpenSpan {
  name: string;
  id?: string;
  t: number;
}

const REPORT_INTERVAL_MS = 1000;
const IDLE_POLL_INTERVAL_MS = 5000;
const LAG_PROBE_INTERVAL_MS = 100;
const MAX_OPEN_SPANS = 200;
const MAX_PENDING_SPANS = 200;
const MAX_REDUX_TYPES = 50;
const MAX_TEXT = 100;
const MAX_ID = 64;
const USER_DATA_PATTERN = /0x[0-9a-fA-F]{6,}|[0-9]{6,}/;
// Engine background-state updates all share one action type; the controller name
// is a static key worth keeping.
const BG_STATE_ACTION = 'UPDATE_BG_STATE';
const CONTROLLER_KEY_PATTERN = /^[A-Za-z]{1,60}$/;

let started = false;
let features: JsFeatures | undefined;
let reportTimer: ReturnType<typeof setTimeout> | undefined;
let lagTimer: ReturnType<typeof setInterval> | undefined;
let lastLagTick = 0;
let maxLagMs = -1;
const openSpans = new Map<string, OpenSpan>();
let completedSpans: CompletedSpan[] = [];
let reduxCount = 0;
let reduxTypes = new Map<string, number>();

function getNativeModule(): PerfSessionNativeModule | undefined {
  return (NativeModules as Record<string, PerfSessionNativeModule | undefined>)
    .MetaMaskPerfSession;
}

/**
 * Printable ASCII up to `max` characters, or undefined when empty or it looks
 * like user data (hex addresses or hashes, long digit runs).
 */
export function sanitizePerfText(
  value: string | undefined | null,
  max = MAX_TEXT,
): string | undefined {
  if (!value || USER_DATA_PATTERN.test(value)) {
    return undefined;
  }
  // eslint-disable-next-line no-control-regex -- keep printable ASCII only
  const printable = value
    .replace(/[^\x20-\x7e]/g, '')
    .slice(0, max)
    .trim();
  return printable || undefined;
}

function spanKey(name: string, id: string | undefined): string {
  return `${name}:${id ?? 'default'}`;
}

function spansWanted(): boolean {
  return features?.spans ?? true;
}

function reduxWanted(): boolean {
  return features?.redux ?? true;
}

function ensureStarted(): boolean {
  const nativeModule = getNativeModule();
  if (!nativeModule?.report) {
    return false;
  }
  if (!started) {
    started = true;
    scheduleReport(REPORT_INTERVAL_MS);
  }
  return true;
}

function scheduleReport(delayMs: number): void {
  reportTimer = setTimeout(sendReport, delayMs);
}

function sendReport(): void {
  reportTimer = undefined;
  const nativeModule = getNativeModule();
  if (!nativeModule?.report) {
    return;
  }
  const payload: {
    spans?: CompletedSpan[];
    jsLagMs?: number;
    redux?: { count: number; types: Record<string, number> };
  } = {};
  if (completedSpans.length > 0) {
    payload.spans = completedSpans;
    completedSpans = [];
  }
  if (maxLagMs >= 0) {
    payload.jsLagMs = Math.round(maxLagMs);
    maxLagMs = -1;
  }
  if (reduxCount > 0) {
    payload.redux = {
      count: reduxCount,
      types: Object.fromEntries(reduxTypes),
    };
    reduxCount = 0;
    reduxTypes = new Map();
  }
  nativeModule
    .report(JSON.stringify(payload))
    .then((json) => applyFeatures(JSON.parse(json) as JsFeatures))
    .catch(() => undefined)
    .finally(() => {
      const anyOn = features
        ? features.spans || features.redux || features.jsLag
        : true;
      scheduleReport(anyOn ? REPORT_INTERVAL_MS : IDLE_POLL_INTERVAL_MS);
    });
}

function applyFeatures(next: JsFeatures): void {
  features = {
    spans: next.spans === true,
    redux: next.redux === true,
    jsLag: next.jsLag === true,
  };
  if (!features.spans) {
    openSpans.clear();
    completedSpans = [];
  }
  if (!features.redux) {
    reduxCount = 0;
    reduxTypes = new Map();
  }
  if (features.jsLag && !lagTimer) {
    lastLagTick = Date.now();
    lagTimer = setInterval(probeLag, LAG_PROBE_INTERVAL_MS);
  } else if (!features.jsLag && lagTimer) {
    clearInterval(lagTimer);
    lagTimer = undefined;
    maxLagMs = -1;
  }
}

/** How late the interval fired: time the JS thread was busy with something else. */
function probeLag(): void {
  const now = Date.now();
  const lag = Math.max(0, now - lastLagTick - LAG_PROBE_INTERVAL_MS);
  lastLagTick = now;
  if (lag > maxLagMs) {
    maxLagMs = lag;
  }
}

function pushCompleted(span: CompletedSpan): void {
  if (completedSpans.length < MAX_PENDING_SPANS) {
    completedSpans.push(span);
  }
}

export function setPerfSessionScreen(name: string | undefined): void {
  if (!name) {
    return;
  }
  getNativeModule()?.setScreen(name);
}

/**
 * Marks the start of a manual `trace()`; ended by {@link recordPerfSpanEnd}.
 *
 * @param name - Trace name.
 * @param id - Trace id, if any.
 * @param startTime - Epoch ms override, as accepted by `trace()`.
 */
export function recordPerfSpanStart(
  name: string,
  id?: string,
  startTime?: number,
): void {
  if (!ensureStarted() || !spansWanted() || openSpans.size >= MAX_OPEN_SPANS) {
    return;
  }
  const safeName = sanitizePerfText(name);
  if (!safeName) {
    return;
  }
  openSpans.set(spanKey(name, id), {
    name: safeName,
    id: sanitizePerfText(id, MAX_ID),
    t: startTime ?? Date.now(),
  });
}

/**
 * Completes a manual `trace()` started with {@link recordPerfSpanStart}.
 *
 * @param name - Trace name.
 * @param id - Trace id, if any.
 * @param status - Final status, if any.
 * @param timestamp - Epoch ms override, as accepted by `endTrace()`.
 */
export function recordPerfSpanEnd(
  name: string,
  id?: string,
  status?: 'ok' | 'error',
  timestamp?: number,
): void {
  if (!started) {
    return;
  }
  const key = spanKey(name, id);
  const open = openSpans.get(key);
  if (!open) {
    return;
  }
  openSpans.delete(key);
  pushCompleted({
    ...open,
    durationMs: Math.max(0, (timestamp ?? Date.now()) - open.t),
    status,
  });
}

/**
 * Wraps a `trace()` callback so its duration is recorded as a span. Returns the
 * callback unchanged when the native module is absent; never changes its result.
 *
 * @param name - Trace name.
 * @param id - Trace id, if any.
 * @param fn - The traced callback.
 * @returns A callback with the same behaviour.
 */
export function wrapPerfSpanCallback<Args extends unknown[], Result>(
  name: string,
  id: string | undefined,
  fn: (...args: Args) => Result,
): (...args: Args) => Result {
  if (!ensureStarted()) {
    return fn;
  }
  return (...args: Args) => {
    if (!spansWanted()) {
      return fn(...args);
    }
    const safeName = sanitizePerfText(name);
    const safeId = sanitizePerfText(id, MAX_ID);
    const t = Date.now();
    const finish = (status: 'ok' | 'error') => {
      if (safeName) {
        pushCompleted({
          name: safeName,
          id: safeId,
          t,
          durationMs: Math.max(0, Date.now() - t),
          status,
        });
      }
    };
    let result: Result;
    try {
      result = fn(...args);
    } catch (error) {
      finish('error');
      throw error;
    }
    const maybePromise = result as unknown as PromiseLike<unknown> | undefined;
    if (maybePromise && typeof maybePromise.then === 'function') {
      // Observe without replacing the caller's promise.
      maybePromise.then(
        () => finish('ok'),
        () => finish('error'),
      );
    } else {
      finish('ok');
    }
    return result;
  };
}

/** Tells the sampler the shake-to-profile ProfilerManager is (not) recording. */
export function setPerfSessionManualProfiling(active: boolean): void {
  getNativeModule()?.setManualProfiling?.(active);
}

/** Whether this build has the perf sampler (Android perf builds only). */
export function isPerfSessionAvailable(): boolean {
  return Boolean(getNativeModule()?.report);
}

/** Counts dispatched action types for the `redux` feature; never reads payloads beyond a static key. */
export const perfSessionReduxMiddleware: Middleware =
  () => (next) => (action) => {
    if (reduxWanted() && ensureStarted()) {
      const { type, payload } = (action ?? {}) as {
        type?: unknown;
        payload?: { key?: unknown };
      };
      if (typeof type === 'string') {
        const controller =
          type === BG_STATE_ACTION &&
          typeof payload?.key === 'string' &&
          CONTROLLER_KEY_PATTERN.test(payload.key)
            ? `:${payload.key}`
            : '';
        const label = sanitizePerfText(`${type}${controller}`);
        if (label) {
          reduxCount++;
          if (reduxTypes.has(label) || reduxTypes.size < MAX_REDUX_TYPES) {
            reduxTypes.set(label, (reduxTypes.get(label) ?? 0) + 1);
          }
        }
      }
    }
    return next(action);
  };

/** Test-only: resets module state and timers. */
export function resetPerfSessionForTests(): void {
  if (reportTimer) {
    clearTimeout(reportTimer);
  }
  if (lagTimer) {
    clearInterval(lagTimer);
  }
  reportTimer = undefined;
  lagTimer = undefined;
  started = false;
  features = undefined;
  maxLagMs = -1;
  lastLagTick = 0;
  openSpans.clear();
  completedSpans = [];
  reduxCount = 0;
  reduxTypes = new Map();
}
