/**
 * Reports the focused screen to the `MetaMaskPerfSession` Android native module,
 * which tags its always-on performance samples with it.
 *
 * The module lives in `android/app/src/main/java/io/metamask/nativeModules/PerfSession`
 * and is only registered in builds with `MM_PERF_SESSION_URL` set (`main-rc-perf`
 * in builds.yml), so on every other build and on iOS this is a no-op.
 * See `scripts/perf-sessions/README.md`.
 */

import { NativeModules } from 'react-native';

interface PerfSessionNativeModule {
  setScreen(name: string): void;
}

export function setPerfSessionScreen(name: string | undefined): void {
  if (!name) {
    return;
  }
  const nativeModule = (
    NativeModules as Record<string, PerfSessionNativeModule | undefined>
  ).MetaMaskPerfSession;
  nativeModule?.setScreen(name);
}
