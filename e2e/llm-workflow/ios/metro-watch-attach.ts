import { execFileSync } from 'node:child_process';

import { IOSLaunchError } from '../launcher-types';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_STABILIZATION_DELAY_MS = 1_500;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_METRO_READY_TIMEOUT_MS = 30_000;
const DEFAULT_DEEPLINK_TIMEOUT_MS = 10_000;
const METRO_POLL_INTERVAL_MS = 500;

export type AttachToMetroOptions = {
  simulatorUdid: string;
  metroPort: number;
  /** App bundle ID — used in the deep-link URL hint (optional, defaults handled). */
  appBundleId?: string;
  /** Max attempts to open the deep link + stabilize. Default: 5. */
  maxAttempts?: number;
  /** Sleep after Metro responds 200, before declaring success. Default: 1500. */
  stabilizationDelayMs?: number;
  /** Delay between retry attempts. Default: 1000. */
  retryDelayMs?: number;
  /** Max time to wait for Metro `/index.bundle` to respond 200. Default: 30_000. */
  metroReadyTimeoutMs?: number;
  /** Optional `fetch` implementation, primarily for testing. Defaults to `globalThis.fetch`. */
  fetchImpl?: typeof fetch;
};

export function buildMetroDeepLink(metroPort: number): {
  bundleUrl: string;
  deepLinkUrl: string;
} {
  const bundleUrl =
    `http://localhost:${metroPort}/index.bundle?` +
    'platform=ios&dev=true&minify=false&disableOnboarding=1';
  const deepLinkUrl =
    `expo-metamask://expo-development-client/?url=` +
    encodeURIComponent(bundleUrl);

  return { bundleUrl, deepLinkUrl };
}

async function isMetroBundling(
  metroPort: number,
  fetchFn: typeof fetch = globalThis.fetch,
): Promise<boolean> {
  try {
    const resp = await fetchFn(`http://localhost:${metroPort}/status`, {
      signal: AbortSignal.timeout(2_000),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export async function attachToMetroWatchMode(
  options: AttachToMetroOptions,
): Promise<void> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const stabilizationDelayMs =
    options.stabilizationDelayMs ?? DEFAULT_STABILIZATION_DELAY_MS;
  const metroReadyTimeoutMs =
    options.metroReadyTimeoutMs ?? DEFAULT_METRO_READY_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const { bundleUrl, deepLinkUrl } = buildMetroDeepLink(options.metroPort);

  await isMetroBundling(options.metroPort, fetchFn).catch(() => false);

  process.stderr.write(
    `[mm-mobile] metro-attach: opening deep link to Metro:${options.metroPort}\n`,
  );

  try {
    execFileSync(
      'xcrun',
      ['simctl', 'openurl', options.simulatorUdid, deepLinkUrl],
      {
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: DEFAULT_DEEPLINK_TIMEOUT_MS,
      },
    );
  } catch (error) {
    process.stderr.write(
      `[mm-mobile] metro-attach: deep link open failed: ${errorMessage(error)}\n`,
    );
    throw new IOSLaunchError({
      code: 'MM_IOS_RUNNER_NOT_READY',
      message: `Failed to open Metro deep link on simulator ${options.simulatorUdid}`,
      remediation:
        'Ensure the simulator is booted and the app is installed. Try `mm cleanup` then re-launch.',
    });
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    process.stderr.write(
      `[mm-mobile] metro-attach: waiting for bundle (attempt ${attempt}/${maxAttempts})\n`,
    );

    if (await waitForMetroBundle(bundleUrl, metroReadyTimeoutMs, fetchFn)) {
      await sleep(stabilizationDelayMs);
      process.stderr.write(
        `[mm-mobile] metro-attach: bundle ready after attempt ${attempt}\n`,
      );
      return;
    }

    process.stderr.write(
      `[mm-mobile] metro-attach: bundle not ready within ${metroReadyTimeoutMs}ms on attempt ${attempt}\n`,
    );

    if (attempt < maxAttempts) {
      const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
      await sleep(retryDelayMs);
    }
  }

  throw new IOSLaunchError({
    code: 'MM_IOS_RUNNER_NOT_READY',
    message: `Metro watch-mode attach failed after ${maxAttempts} attempts (port ${options.metroPort})`,
    remediation:
      'Ensure `yarn watch:clean` is running and the Metro bundler responds at /index.bundle. Try `mm cleanup` then re-launch.',
  });
}

async function waitForMetroBundle(
  bundleUrl: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetchFn(bundleUrl, {
        signal: AbortSignal.timeout(5_000),
      });

      if (response.ok) {
        return true;
      }
    } catch {
      // Keep polling until the overall deadline expires.
    }

    await sleep(METRO_POLL_INTERVAL_MS);
  }

  return false;
}

function sleep(durationMs: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, durationMs));
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}
