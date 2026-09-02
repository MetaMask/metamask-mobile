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

import { startProfiling, stopProfiling } from 'react-native-release-profiler';

export const isPerformanceProfilingEnabled =
  process.env.IS_PERFORMANCE_TEST === 'true';

let isRecording = false;
let lastProfilePath: string | null = null;

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

  await startProfiling();
  isRecording = true;
  lastProfilePath = null;
  return true;
}

/**
 * Stops the active profiling session and returns the on-device profile path.
 * On Android, `stopProfiling(true)` copies the `.cpuprofile` to Downloads.
 * No-ops unless this is a performance-test APK with an active session.
 */
export async function stopAppProfiling(
  enabled: boolean = isPerformanceProfilingEnabled,
): Promise<string | null> {
  if (!enabled || !isRecording) {
    return null;
  }

  const path = await stopProfiling(true);
  isRecording = false;

  if (typeof path === 'string' && path.length > 0) {
    lastProfilePath = path;
    return lastProfilePath;
  }

  lastProfilePath = null;
  return null;
}

export function isAppProfilingRecording(): boolean {
  return isRecording;
}

export function getLastAppProfilePath(): string | null {
  return lastProfilePath;
}

/**
 * Test-only reset for unit tests.
 * @internal
 */
export function __resetAppProfilingForTests(): void {
  isRecording = false;
  lastProfilePath = null;
}
