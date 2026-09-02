/**
 * Deep-link bridge that invokes {@link startAppProfiling} / {@link stopAppProfiling}
 * on performance-test APKs only (`IS_PERFORMANCE_TEST=true`).
 *
 * Schemes (Appium should use the metamask-mapped form via `openE2EUrl`):
 * - `metamask://e2e/profiler/start` / `e2e://profiler/start`
 * - `metamask://e2e/profiler/stop` / `e2e://profiler/stop`
 *
 * Command-queue polling stays disabled on performance APKs; this bridge is the
 * non-UI way for a performance scenario to call the profiling functions.
 */

import { Linking } from 'react-native';
import DevLogger from '../SDKConnect/utils/DevLogger';
import {
  isPerformanceProfilingEnabled,
  startAppProfiling,
  stopAppProfiling,
} from './appProfiling';

export const PERFORMANCE_PROFILER_METAMASK_SCHEME = 'metamask://e2e/profiler/';
export const PERFORMANCE_PROFILER_RAW_SCHEME = 'e2e://profiler/';

let hasRegisteredDeepLinkHandler = false;
const processedDeepLinks = new Set<string>();

function stripProfilerScheme(url: string): string {
  const prefixes = [
    PERFORMANCE_PROFILER_METAMASK_SCHEME,
    PERFORMANCE_PROFILER_RAW_SCHEME,
  ];
  let current = url;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let matched = false;
    for (const prefix of prefixes) {
      if (current.startsWith(prefix)) {
        current = current.slice(prefix.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      break;
    }
  }
  return current;
}

function isProfilerDeepLink(url: string): boolean {
  return (
    url.startsWith(PERFORMANCE_PROFILER_METAMASK_SCHEME) ||
    url.startsWith(PERFORMANCE_PROFILER_RAW_SCHEME)
  );
}

async function handleProfilerUrl(incomingUrl?: string): Promise<void> {
  const url = incomingUrl || '';
  if (!url || !isProfilerDeepLink(url)) {
    return;
  }

  if (processedDeepLinks.has(url)) {
    return;
  }
  processedDeepLinks.add(url);

  const withoutScheme = stripProfilerScheme(url);
  const [path] = withoutScheme.split('?');

  if (path === 'start') {
    DevLogger.log('[Performance Profiler] startAppProfiling via deeplink');
    await startAppProfiling();
    return;
  }

  if (path === 'stop') {
    DevLogger.log('[Performance Profiler] stopAppProfiling via deeplink');
    await stopAppProfiling();
  }
}

/**
 * Registers the Linking handler. Safe to call multiple times; only registers
 * when `IS_PERFORMANCE_TEST` is baked into the APK.
 */
export function registerPerformanceProfilerBridge(): void {
  if (hasRegisteredDeepLinkHandler || !isPerformanceProfilingEnabled) {
    return;
  }

  try {
    Linking.addEventListener('url', (event: { url: string }) => {
      handleProfilerUrl(event?.url).catch((error) => {
        DevLogger.log('[Performance Profiler] deeplink handler failed', error);
      });
    });

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) {
          return handleProfilerUrl(initialUrl);
        }
        return undefined;
      })
      .catch(() => {
        // no-op
      });

    hasRegisteredDeepLinkHandler = true;
    DevLogger.log('[Performance Profiler] Registered profiler deeplink bridge');
  } catch (error) {
    DevLogger.log(
      '[Performance Profiler] Failed to register profiler deeplink bridge',
      error,
    );
  }
}

/**
 * Test-only reset for unit tests.
 * @internal
 */
export function __resetPerformanceProfilerBridgeForTests(): void {
  hasRegisteredDeepLinkHandler = false;
  processedDeepLinks.clear();
}
