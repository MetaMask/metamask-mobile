/**
 * Local startup-stage timeline for measurement builds.
 *
 * ## Why this exists alongside `trace()`
 *
 * `trace()` is the right production instrumentation, but it cannot be read on a
 * measurement device: spans buffer until the user grants metrics consent, and
 * they flush to Sentry, which needs `MM_SENTRY_DSN`. Neither holds on a freshly
 * onboarded test wallet, so startup numbers are invisible exactly when we most
 * need them. This module is the local counterpart — same seams, readable over
 * `adb logcat`, no consent and no network.
 *
 * ## Why `nativeLoggingHook` and not `console`
 *
 * `babel.config.js` applies `transform-remove-console` in the `production` babel
 * env, so every `console.*` call is stripped from release builds — the only
 * builds whose startup timings are worth measuring. `global.nativeLoggingHook`
 * writes straight to logcat/NSLog and is a plain global call, so the plugin
 * leaves it alone.
 *
 * ## Cost when disabled
 *
 * `process.env.MM_STARTUP_TIMELINE` is inlined at build time by
 * `transform-inline-environment-variables` (see {@link ./StartupTimelineFlags},
 * which exists so the flag stays inlinable *and* mockable in tests), so in a
 * normal build `ENABLED` is a
 * literal `false` and every function below collapses to an empty body that a
 * minifier can drop.
 *
 * Read the output with `adb logcat -s ReactNativeJS | grep MM_STARTUP`.
 */

import {
  PROFILE_ENABLED as PROFILE_ENABLED_FLAG,
  TIMELINE_ENABLED,
} from './StartupTimelineFlags';

/** Log level passed to `nativeLoggingHook`; 3 === error, which is never filtered out. */
const LOG_LEVEL_ERROR = 3;

const LOG_PREFIX = 'MM_STARTUP';

export const ENABLED = TIMELINE_ENABLED;

/**
 * Records a Hermes sampling profile across cold start, stopped at
 * `splash_loader_done`.
 *
 * Separate from {@link ENABLED} because the sampling profiler has real
 * overhead: stage marks from a profiled run are **inflated** and must not be
 * used as headline timings. Use a profiled build for *attribution* (which
 * modules dominate the navigator module-evaluation burst) and an unprofiled
 * build for absolute numbers.
 *
 * One exception: the splash reveal tax is driven by `setTimeout` durations
 * (800 + 250 + 300 ms), which are wall-clock and therefore unaffected by
 * profiler overhead. That number stays trustworthy in a profiled run.
 *
 * `ProfilerManager` cannot serve this purpose — it is shake-to-open and
 * manual, so by the time its UI exists startup is already over, and it is
 * gated to `rc`/`exp` only.
 *
 * Android writes the trace to the Downloads folder; pull it with
 * `adb pull /sdcard/Download/<name>.cpuprofile`, then symbolicate via
 * `npx react-native-release-profiler --local <trace>`.
 */
export const PROFILE_ENABLED = PROFILE_ENABLED_FLAG;

let profileStarted = false;

/**
 * Begin the startup CPU profile. Called as early as possible in the entry
 * module. The profiler package is required lazily so that a build without
 * `MM_STARTUP_PROFILE` never pulls it onto the startup path.
 */
export function startStartupProfile(): void {
  if (!PROFILE_ENABLED || profileStarted) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { startProfiling } = require('react-native-release-profiler');
    startProfiling();
    profileStarted = true;
    emit(`${LOG_PREFIX} profile_started`);
  } catch (error) {
    emit(`${LOG_PREFIX} profile_start_failed ${String(error)}`);
  }
}

/**
 * Stop the startup CPU profile and write it to disk, logging the path so it can
 * be pulled without opening the app.
 */
export async function stopStartupProfile(): Promise<void> {
  if (!PROFILE_ENABLED || !profileStarted) {
    return;
  }
  profileStarted = false;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { stopProfiling } = require('react-native-release-profiler');
    const path: unknown = await stopProfiling(true);
    emit(`${LOG_PREFIX} profile_saved ${String(path)}`);
  } catch (error) {
    emit(`${LOG_PREFIX} profile_stop_failed ${String(error)}`);
  }
}

/**
 * Startup seams, in the order a cold launch passes through them.
 *
 * Names are snake_case because they are consumed by log-scraping scripts, not
 * by TypeScript callers.
 */
export type StartupMark =
  /** End of `index.js` — bundle prelude + entry evaluation is done. */
  | 'js_bundle_evaluated'
  /** redux-persist rehydration finished (`onPersistComplete`). */
  | 'store_persist_complete'
  /** Reading every `persist:<Controller>` blob — start. */
  | 'controller_rehydrate_start'
  /** Reading every `persist:<Controller>` blob — done. */
  | 'controller_rehydrate_end'
  /** `Engine.init()` — synchronous construction of all controllers. */
  | 'engine_init_start'
  | 'engine_init_end'
  /** `setAppServicesReady()` — the gate that unblocks the whole UI. */
  | 'app_services_ready'
  /** `AppFlow`'s first render — the navigator module-evaluation burst. */
  | 'root_navigator_render_start'
  | 'root_navigator_render_end'
  /** Splash overlay fully removed (end of the fixed reveal tax). */
  | 'splash_loader_done'
  /** Unlock screen genuinely accepts input. */
  | 'unlock_interactive'
  /** Homepage rendered a usable state. */
  | 'homepage_ready';

interface TimelineEntry {
  mark: StartupMark;
  /** Absolute epoch milliseconds, for aligning against native launch. */
  epochMs: number;
  /** Milliseconds since the first recorded mark. */
  sinceFirstMs: number;
}

let entries: TimelineEntry[] = [];
let firstEpochMs: number | null = null;
const recorded = new Set<StartupMark>();

/**
 * Emit one line to the platform log. Guarded because `nativeLoggingHook` is a
 * React Native global that is absent under Jest and in bare JS contexts.
 */
function emit(line: string): void {
  const hook = (
    globalThis as typeof globalThis & {
      nativeLoggingHook?: (message: string, logLevel: number) => void;
    }
  ).nativeLoggingHook;

  hook?.(line, LOG_LEVEL_ERROR);
}

/**
 * Emit a prefixed line on the startup log channel. Exposed so sibling
 * measurement probes share one channel and one `MM_STARTUP` grep.
 *
 * @param line - Text appended after the `MM_STARTUP` prefix.
 */
export function emitStartupLine(line: string): void {
  if (!ENABLED) {
    return;
  }
  emit(`${LOG_PREFIX} ${line}`);
}

/**
 * Record a startup seam and emit it to the platform log.
 *
 * No-ops unless the build set `MM_STARTUP_TIMELINE=true`. Safe to call from
 * render paths: it does no I/O and allocates one small object.
 *
 * @param mark - The seam being recorded.
 */
export function startupMark(mark: StartupMark): void {
  if (!ENABLED) {
    return;
  }

  // Each seam is recorded once per launch. Some call sites fire repeatedly by
  // nature (e.g. a view's `onLayout`), and a startup timeline wants the first
  // occurrence — the moment the seam was reached — not every re-entry.
  if (recorded.has(mark)) {
    return;
  }
  recorded.add(mark);

  const epochMs = Date.now();
  if (firstEpochMs === null) {
    firstEpochMs = epochMs;
  }

  const entry: TimelineEntry = {
    mark,
    epochMs,
    sinceFirstMs: epochMs - firstEpochMs,
  };
  entries.push(entry);

  emit(
    `${LOG_PREFIX} ${mark} epoch=${epochMs} since_first=${entry.sinceFirstMs}ms`,
  );
}

/**
 * Emit the full timeline as one line of JSON, so a single logcat grep yields a
 * parseable record rather than requiring the reader to stitch marks together.
 *
 * @param label - Free-form tag identifying this launch (e.g. the flow measured).
 */
export function flushStartupTimeline(label: string): void {
  if (!ENABLED || entries.length === 0) {
    return;
  }

  emit(`${LOG_PREFIX}_TIMELINE ${JSON.stringify({ label, entries })}`);
}

/**
 * Emit the native startup markers React Native already produces, so the phases
 * *before* JavaScript runs are visible.
 *
 * `react-native-performance`'s Android module bridges ~30 `ReactMarker`
 * constants into buffered `react-native-mark` performance entries —
 * `nativeLaunchStart/End`, `loadReactNativeSoFileStart/End`, `vmInit`,
 * `createReactContextStart/End`, `processCoreReactPackageStart/End`,
 * `createViewManagersStart/End`, `buildNativeModuleRegistryStart/End`,
 * `runJsBundleStart/End`, `setupReactContextStart/End`, `contentAppeared`.
 * They are recorded on every build but never surfaced in release, because the
 * only consumer logs them through `console.info`, which
 * `transform-remove-console` strips.
 *
 * Timebase: entry `startTime` is relative to `performance.timeOrigin`, which
 * the library anchors at native launch. `performance.now()` is emitted
 * alongside so the JS marks above (wall-clock `Date.now()`) can be aligned onto
 * the same axis in post-processing.
 *
 * Not all markers fire under bridgeless/New Architecture — several are
 * legacy-bridge concepts. Whatever is present is emitted; nothing is assumed.
 */
export function flushNativeStartupMarks(): void {
  if (!ENABLED) {
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { default: perf } = require('react-native-performance');
    const nativeMarks: { name: string; startTime: number }[] =
      perf.getEntriesByType('react-native-mark');

    emit(
      `${LOG_PREFIX}_NATIVE _anchor time_origin=${perf.timeOrigin} now=${perf.now()} epoch=${Date.now()}`,
    );
    for (const entry of [...nativeMarks].sort(
      (a, b) => a.startTime - b.startTime,
    )) {
      emit(
        `${LOG_PREFIX}_NATIVE ${entry.name} t=${Math.round(entry.startTime)}`,
      );
    }
    emit(`${LOG_PREFIX}_NATIVE _count ${nativeMarks.length}`);
  } catch (error) {
    emit(`${LOG_PREFIX}_NATIVE _failed ${String(error)}`);
  }
}

/**
 * The marks recorded so far. Exposed for tests and for in-app debug surfaces.
 */
export function getStartupTimeline(): readonly TimelineEntry[] {
  return entries;
}

/** @internal Reset module state between tests. Do not call in production code. */
export function resetStartupTimelineForTesting(): void {
  entries = [];
  firstEpochMs = null;
  recorded.clear();
}
