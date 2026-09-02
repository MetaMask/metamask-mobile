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

import { Platform } from 'react-native';
import RNFS from 'react-native-fs';
import { startProfiling, stopProfiling } from 'react-native-release-profiler';

export const isPerformanceProfilingEnabled =
  process.env.IS_PERFORMANCE_TEST === 'true';

/**
 * Stable Android Downloads filename so Appium can `pullFile` without discovering
 * the unique name returned by `stopProfiling`.
 */
export const PERFORMANCE_PROFILE_ANDROID_FILENAME =
  'metamask-performance-latest.cpuprofile';

export const PERFORMANCE_PROFILE_ANDROID_REMOTE_PATH = `/sdcard/Download/${PERFORMANCE_PROFILE_ANDROID_FILENAME}`;

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
 * On Android, `stopProfiling(true)` copies the `.cpuprofile` to Downloads, then
 * we also copy it to {@link PERFORMANCE_PROFILE_ANDROID_FILENAME} for Appium pull.
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

  if (typeof path !== 'string' || path.length === 0) {
    lastProfilePath = null;
    return null;
  }

  if (Platform.OS === 'android') {
    const stablePath = `${RNFS.DownloadDirectoryPath}/${PERFORMANCE_PROFILE_ANDROID_FILENAME}`;
    await RNFS.copyFile(path, stablePath);
    lastProfilePath = stablePath;
    return lastProfilePath;
  }

  lastProfilePath = path;
  return lastProfilePath;
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
