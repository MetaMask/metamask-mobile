/**
 * Programmatic Hermes CPU profiling for performance-test APKs only.
 *
 * BrowserStack performance builds bake `IS_PERFORMANCE_TEST=true` (see
 * `builds.yml` `main-e2e-bs-*`). Smoke e2e and production builds leave these
 * helpers as no-ops so profiling cannot be enabled outside that APK class.
 *
 * Matches platform guidance: call `startProfiling` / `stopProfiling` from
 * `react-native-release-profiler` in app code, gated to performance APKs.
 */

import {
  startProfiling,
  stopProfiling,
} from 'react-native-release-profiler';

export const isPerformanceProfilingEnabled =
  process.env.IS_PERFORMANCE_TEST === 'true';

export interface AppProfilingStatus {
  isRecording: boolean;
  lastProfilePath: string | null;
  lastError: string | null;
}

type AppProfilingListener = (status: AppProfilingStatus) => void;

let isRecording = false;
let lastProfilePath: string | null = null;
let lastError: string | null = null;
const listeners = new Set<AppProfilingListener>();

function getStatus(): AppProfilingStatus {
  return { isRecording, lastProfilePath, lastError };
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
  notifyListeners();

  try {
    // startProfiling() is synchronous (returns boolean); await is harmless.
    const started = await Promise.resolve(startProfiling());
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
 * Uses `stopProfiling(true)` which writes to internal cache then copies to
 * the public Downloads folder via MediaStore (Appium-pullable on Android).
 * No-ops unless this is a performance-test APK with an active session.
 */
export async function stopAppProfiling(
  enabled: boolean = isPerformanceProfilingEnabled,
): Promise<string | null> {
  if (!enabled) {
    return null;
  }

  if (!isRecording) {
    lastError = 'stopProfiling skipped: no active profiling session';
    notifyListeners();
    return null;
  }

  lastError = null;
  notifyListeners();

  try {
    // saveToDownloads=true: writes to internal cache then copies via MediaStore
    // to the public Downloads folder.  The cache write is fast (avoids the
    // external-storage hang seen with stopProfilingToExternalFiles) and the
    // MediaStore copy puts the file at /sdcard/Download/<name> where Appium
    // can pull it.  The promise resolves with the internal cache path, which
    // the test-side toAndroidPullPath() converts to /sdcard/Download/<name>.
    const path = await stopProfiling(true);
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
  listeners.clear();
}
