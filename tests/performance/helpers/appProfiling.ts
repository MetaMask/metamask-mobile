/**
 * Performance-test helpers that invoke in-app `startAppProfiling` /
 * `stopAppProfiling` via deeplink (performance APKs only).
 */

import { openE2EUrl } from '../framework/DeepLink.ts';
import { E2EDeeplinkSchemes } from '../framework/Constants.ts';

export async function startAppProfilingFromTest(): Promise<void> {
  await openE2EUrl(`${E2EDeeplinkSchemes.PROFILER}start`);
}

export async function stopAppProfilingFromTest(): Promise<void> {
  await openE2EUrl(`${E2EDeeplinkSchemes.PROFILER}stop`);
}
