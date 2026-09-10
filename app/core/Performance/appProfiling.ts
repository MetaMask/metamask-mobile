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
 * A profiling session cannot outlive the app process that started it. Specs
 * that deliberately kill the app (`terminateApp`) reload the JS bundle and
 * therefore reset the state below, which is reported as a lost session rather
 * than stopping a session that Hermes no longer has. Attempting a dump with no
 * active sampler is what makes the native stop call hang.
 */

import { startProfiling, stopProfiling } from 'react-native-release-profiler';
import { Platform } from 'react-native';
import { getHermesProfilerModule } from './hermesProfilerModule';

export const isPerformanceProfilingEnabled =
  process.env.IS_PERFORMANCE_TEST === 'true';

export interface AppProfilingStatus {
  isRecording: boolean;
  isSessionLost: boolean;
  lastProfilePath: string | null;
  lastError: string | null;
}

type AppProfilingListener = (status: AppProfilingStatus) => void;

let isRecording = false;
let isSessionLost = false;
let lastProfilePath: string | null = null;
let lastError: string | null = null;
const listeners = new Set<AppProfilingListener>();

function getStatus(): AppProfilingStatus {
  return { isRecording, isSessionLost, lastProfilePath, lastError };
}

function notifyListeners(): void {
  const status = getStatus();
  listeners.forEach((listener) => {
    listener(status);
  });
}

export function subscribeAppProfilingStatus(
  listener: AppProfilingListener,
): () => void {
  listeners.add(listener);
  listener(getStatus());
  return () => {
    listeners.delete(listener);
  };
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
  isSessionLost = false;
  notifyListeners();

  try {
    const profiler = getHermesProfilerModule();
    const started = profiler
      ? await profiler.startProfiling()
      : await Promise.resolve(startProfiling());

    if (!started) {
      isRecording = false;
      lastError = 'startProfiling returned false';
      notifyListeners();
      return false;
    }

    isRecording = true;
    lastProfilePath = null;
    notifyListeners();
    return true;
  } catch (error) {
    isRecording = false;
    lastError = `startProfiling failed: ${String(error)}`;
    notifyListeners();
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
    isSessionLost = true;
    lastProfilePath = null;
    notifyListeners();
    return null;
  }

  lastError = null;
  notifyListeners();

  try {
    const profiler = getHermesProfilerModule();
    const path = profiler
      ? await profiler.stopProfilingToAppStorage()
      : await stopProfiling(Platform.OS === 'android');
    isRecording = false;

    if (typeof path === 'string' && path.length > 0) {
      lastProfilePath = path;
      notifyListeners();
      return lastProfilePath;
    }

    lastProfilePath = null;
    lastError = 'stopProfiling returned an empty path';
    notifyListeners();
    return null;
  } catch (error) {
    isRecording = false;
    lastError = `stopProfiling failed: ${String(error)}`;
    notifyListeners();
    throw error;
  }
}

export function isAppProfilingRecording(): boolean {
  return isRecording;
}

export function isAppProfilingSessionLost(): boolean {
  return isSessionLost;
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
  isSessionLost = false;
  lastProfilePath = null;
  lastError = null;
  listeners.clear();
}
