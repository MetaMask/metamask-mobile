/**
 * Access to the `MetaMaskHermesProfiler` Android native module.
 *
 * The module lives in `android/app/src/main/java/io/metamask/nativeModules/HermesProfiler`
 * and is only registered when `BuildConfig.IS_PERFORMANCE_TEST` is true, so it
 * is absent on every other Android build and on iOS. Callers must treat a
 * missing module as "profiling unavailable" rather than an error.
 */

import { NativeModules, Platform } from 'react-native';

export interface HermesProfilerNativeModule {
  startProfiling(): Promise<boolean>;
  stopProfilingToAppStorage(): Promise<string>;
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
