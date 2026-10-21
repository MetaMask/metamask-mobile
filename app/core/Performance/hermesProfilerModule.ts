/**
 * Access to the `MetaMaskHermesProfiler` Android native module.
 *
 * The module lives in `android/app/src/main/java/io/metamask/nativeModules/HermesProfiler`
 * and is only registered when `BuildConfig.IS_PERFORMANCE_TEST` is true, so it
 * is absent on every other Android build and on iOS. On iOS a missing module is
 * expected and callers fall back to `react-native-release-profiler`. On Android
 * inside a performance APK a missing module means the JS and Gradle flags
 * disagree — callers should treat that as a configuration error, not fall back.
 */

import { NativeModules, Platform } from 'react-native';

export interface HermesProfilerNativeModule {
  startProfiling(): Promise<boolean>;
  stopProfilingToAppStorage(): Promise<string>;
  /**
   * Clears the sample buffer without writing a segment and without disabling
   * the sampler.
   */
  discardProfilingSamples(): Promise<boolean>;
  /**
   * Writes `metamask-performance.armed` so the test can see that the measured
   * window is open. The file body is `<nonce>\n<highestExistingSegment>`.
   */
  markProfilingArmed(nonce: string): Promise<boolean>;
}

export function getHermesProfilerModule(): HermesProfilerNativeModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const nativeModule = (
    NativeModules as Record<string, HermesProfilerNativeModule | undefined>
  ).MetaMaskHermesProfiler;

  return nativeModule ?? null;
}
