/**
 * Programmatic Hermes CPU profiling for performance-test APKs only.
 *
 * BrowserStack performance builds bake `IS_PERFORMANCE_TEST=true` (see
 * `builds.yml` `main-e2e-bs-*`). Smoke e2e and production builds leave these
 * helpers as no-ops so profiling cannot be enabled outside that APK class.
 *
 * Android goes through the `MetaMaskHermesProfiler` native module, which is
 * compiled into performance APKs only and mirrors the stop sequence of the
 * shake-driven RC flow against the prebuilt `hermes-android` artifact. iOS uses
 * `react-native-release-profiler` directly; export/pull is not implemented
 * there yet.
 *
 * The session is driven entirely by the app process, not by the test: it arms
 * itself as soon as JS runs and dumps whenever the app stays backgrounded long
 * enough to clear a short grace period. A profiling session cannot outlive the
 * process that opened it, so a process that never armed itself never dumps.
 */

import { AppState, Platform, type NativeEventSubscription } from 'react-native';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';
import Logger from '../../util/Logger';
import { getHermesProfilerModule } from './hermesProfilerModule';

export const isPerformanceProfilingEnabled =
  process.env.IS_PERFORMANCE_TEST === 'true';

/**
 * Transient Android pauses (biometric prompts, permission dialogs, share
 * sheets, Custom Tabs) also fire `AppState` `'background'`. Waiting this long
 * before dumping avoids spending a multi-MB write on those brief pauses; a
 * real test-driven background lasts well past this window.
 */
const BACKGROUND_DUMP_GRACE_MS = 500;

let isRecording = false;
let lastProfilePath: string | null = null;
let lastError: string | null = null;
let appStateSubscription: NativeEventSubscription | null = null;
let backgroundDumpTimeout: ReturnType<typeof setTimeout> | null = null;

function clearBackgroundDumpTimeout(): void {
  if (backgroundDumpTimeout !== null) {
    clearTimeout(backgroundDumpTimeout);
    backgroundDumpTimeout = null;
  }
}

/**
 * Starts a Hermes CPU profiling session.
 * No-ops unless this is a performance-test APK.
 */
export async function startAppProfiling(
  enabled: boolean = isPerformanceProfilingEnabled,
): Promise<boolean> {
  if (!enabled) {
    return false;
  }

  lastError = null;

  try {
    const profiler = getHermesProfilerModule();

    // The Babel inlined `IS_PERFORMANCE_TEST` flag and Gradle's
    // `BuildConfig.IS_PERFORMANCE_TEST` come from the same env var but through
    // different processes. When JS sees the flag and the native module is
    // missing, Gradle almost certainly did not, and falling back to
    // `react-native-release-profiler` would write somewhere the fixture never
    // looks — the run would "pass" with zero traces. Be loud on Android.
    if (Platform.OS === 'android' && !profiler) {
      lastError =
        'MetaMaskHermesProfiler is not registered; BuildConfig.IS_PERFORMANCE_TEST is likely false';
      Logger.error(new Error(lastError), {
        tags: { feature: 'performance-profiling' },
      });
      isRecording = false;
      return false;
    }

    const started = profiler
      ? await profiler.startProfiling()
      : await Promise.resolve(startProfiling());

    if (!started) {
      isRecording = false;
      lastError = 'startProfiling returned false';
      return false;
    }

    isRecording = true;
    lastProfilePath = null;
    return true;
  } catch (error) {
    isRecording = false;
    lastError = `startProfiling failed: ${String(error)}`;
    throw error;
  }
}

/**
 * Stops the active profiling session and returns the on-device profile path.
 *
 * On Android the trace is written to app-scoped external storage, which Appium
 * can retrieve with `pullFile` on a non-rooted device. Returns `null` without
 * touching Hermes when there is no session to stop.
 */
export async function stopAppProfiling(
  enabled: boolean = isPerformanceProfilingEnabled,
): Promise<string | null> {
  if (!enabled) {
    return null;
  }

  if (!isRecording) {
    lastProfilePath = null;
    return null;
  }

  lastError = null;

  try {
    const profiler = getHermesProfilerModule();

    if (Platform.OS === 'android' && !profiler) {
      lastError =
        'MetaMaskHermesProfiler is not registered; BuildConfig.IS_PERFORMANCE_TEST is likely false';
      Logger.error(new Error(lastError), {
        tags: { feature: 'performance-profiling' },
      });
      isRecording = false;
      return null;
    }

    const path = profiler
      ? await profiler.stopProfilingToAppStorage()
      : await stopProfiling(Platform.OS === 'android');
    isRecording = false;

    if (typeof path === 'string' && path.length > 0) {
      lastProfilePath = path;
      return lastProfilePath;
    }

    lastProfilePath = null;
    lastError = 'stopProfiling returned an empty path';
    return null;
  } catch (error) {
    isRecording = false;
    lastError = `stopProfiling failed: ${String(error)}`;
    throw error;
  }
}

/**
 * Writes out the in-flight trace and arms the next one.
 *
 * Failures are left in `lastError` rather than propagated: this runs from an app
 * lifecycle callback, where there is nobody to report to, and a dump that fails
 * should not stop the following segments from being recorded.
 */
function dumpAndRearm(enabled: boolean): void {
  stopAppProfiling(enabled)
    .catch(() => undefined)
    .then(() => startAppProfiling(enabled))
    .catch(() => undefined);
}

/**
 * Arms profiling for this app process and keeps it armed for the process's
 * lifetime.
 *
 * Called from the app entry point so the trace covers startup. The performance
 * specs measure launch timings, and anything that asks the app to start
 * profiling from the outside costs an Appium round trip at exactly the moment
 * those timers begin. Self-arming is free, so a spec that restarts the app gets
 * the restarted process profiled too.
 *
 * Backgrounding is the dump trigger. It is the only signal available to the app
 * that both the test can produce on demand (`mobile: backgroundApp`) and that
 * cannot be swallowed by whatever is on screen. A short grace period filters
 * out transient Android pauses (biometric prompts, permission dialogs, Custom
 * Tabs) that also fire `AppState` `'background'`. Profiling re-arms afterwards
 * because specs background the app mid-test — the warm-start specs and the
 * OAuth hand-offs in seedless onboarding do — and the work after that point
 * still belongs to the test.
 */
export function initializeAppProfiling(
  enabled: boolean = isPerformanceProfilingEnabled,
): void {
  if (!enabled || appStateSubscription) {
    return;
  }

  startAppProfiling(enabled).catch(() => {
    // Recorded in lastError; never block app startup on profiling.
  });

  appStateSubscription = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'background') {
      clearBackgroundDumpTimeout();
      backgroundDumpTimeout = setTimeout(() => {
        backgroundDumpTimeout = null;
        dumpAndRearm(enabled);
      }, BACKGROUND_DUMP_GRACE_MS);
      return;
    }

    // Foreground (or inactive) again before the grace elapsed — cancel the dump.
    clearBackgroundDumpTimeout();
  });
}

export function isAppProfilingRecording(): boolean {
  return isRecording;
}

export function getLastAppProfilePath(): string | null {
  return lastProfilePath;
}

export function getLastAppProfilingError(): string | null {
  return lastError;
}

/**
 * Test-only reset for unit tests.
 * @internal
 */
export function __resetAppProfilingForTests(): void {
  isRecording = false;
  lastProfilePath = null;
  lastError = null;
  clearBackgroundDumpTimeout();
  appStateSubscription?.remove();
  appStateSubscription = null;
}
