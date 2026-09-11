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
 * itself as soon as JS runs and dumps whenever the app is backgrounded. A
 * profiling session cannot outlive the process that opened it, and asking
 * Hermes to dump a sampler it is no longer running is what makes the native
 * stop call hang, so a process that never armed itself never dumps.
 */

import { AppState, Platform, type NativeEventSubscription } from 'react-native';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';
import { getHermesProfilerModule } from './hermesProfilerModule';

export const isPerformanceProfilingEnabled =
  process.env.IS_PERFORMANCE_TEST === 'true';

let isRecording = false;
let lastProfilePath: string | null = null;
let lastError: string | null = null;
let appStateSubscription: NativeEventSubscription | null = null;

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
 * cannot be swallowed by whatever is on screen. Profiling re-arms afterwards
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
    if (nextState !== 'background') {
      return;
    }
    dumpAndRearm(enabled);
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
  appStateSubscription?.remove();
  appStateSubscription = null;
}
