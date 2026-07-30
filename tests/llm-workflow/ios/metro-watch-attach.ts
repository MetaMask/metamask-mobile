import { execFileSync } from 'node:child_process';

import {
  probeHermesHealthy,
  verifyJsLiveness,
  type ProbeHermesHealthy,
} from './hermes-health';
import { IOSLaunchError } from '../launcher-types';

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_RETRY_DELAY_MS = 1_000;
const DEFAULT_METRO_READY_TIMEOUT_MS = 30_000;
const DEFAULT_DEEPLINK_TIMEOUT_MS = 10_000;
const METRO_POLL_INTERVAL_MS = 500;
const DEFAULT_HERMES_PROBE_INTERVAL_MS = 500;
const DEFAULT_HERMES_PROBE_CEILING_MS = 20_000;
const DEFAULT_LIVENESS_TIMEOUT_MS = 5_000;

export type AttachToMetroOptions = {
  simulatorUdid: string;
  metroPort: number;
  appBundleId: string;
  pinnedDeviceId?: string;
  maxAttempts?: number;
  retryDelayMs?: number;
  metroReadyTimeoutMs?: number;
  hermesProbeIntervalMs?: number;
  hermesProbeCeilingMs?: number;
  livenessTimeoutMs?: number;
  fetchImpl?: typeof fetch;
  probeHealthyImpl?: ProbeHermesHealthy;
  verifyLivenessImpl?: typeof verifyJsLiveness;
};

export type AttachToMetroResult = {
  pinnedDeviceId?: string;
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

export async function attachToMetroWatchMode(
  options: AttachToMetroOptions,
): Promise<AttachToMetroResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
  const metroReadyTimeoutMs =
    options.metroReadyTimeoutMs ?? DEFAULT_METRO_READY_TIMEOUT_MS;
  const fetchFn = options.fetchImpl ?? globalThis.fetch;
  const probeHealthy = options.probeHealthyImpl ?? probeHermesHealthy;
  const verifyLiveness = options.verifyLivenessImpl ?? verifyJsLiveness;
  const hermesProbeIntervalMs =
    options.hermesProbeIntervalMs ?? DEFAULT_HERMES_PROBE_INTERVAL_MS;
  const hermesProbeCeilingMs =
    options.hermesProbeCeilingMs ?? DEFAULT_HERMES_PROBE_CEILING_MS;
  const livenessTimeoutMs =
    options.livenessTimeoutMs ?? DEFAULT_LIVENESS_TIMEOUT_MS;
  const { deepLinkUrl } = buildMetroDeepLink(options.metroPort);

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
      code: 'MM_DEVICE_NOT_AVAILABLE',
      message: `Failed to open Metro deep link on simulator ${options.simulatorUdid}`,
      remediation:
        'Ensure the simulator is booted and the app is installed. Try `mm cleanup` then re-launch.',
    });
  }

  const statusUrl = `http://localhost:${options.metroPort}/status`;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    process.stderr.write(
      `[mm-mobile] metro-attach: waiting for Metro to be ready (attempt ${attempt}/${maxAttempts})\n`,
    );

    if (await waitForMetroReady(statusUrl, metroReadyTimeoutMs, fetchFn)) {
      process.stderr.write(
        `[mm-mobile] metro-attach: Metro ready after attempt ${attempt}, probing Hermes health\n`,
      );

      const healthResult = await probeHealthy({
        port: options.metroPort,
        appId: options.appBundleId,
        pinnedDeviceId: options.pinnedDeviceId,
        intervalMs: hermesProbeIntervalMs,
        ceilingMs: hermesProbeCeilingMs,
      });

      if (!healthResult.healthy || !healthResult.target?.webSocketDebuggerUrl) {
        throw new IOSLaunchError({
          code: 'MM_LAUNCH_FAILED',
          message:
            `Hermes health check failed after deep-link attach on port ${options.metroPort}` +
            (healthResult.reason ? ` (reason: ${healthResult.reason})` : ''),
          remediation:
            healthResult.reason === 'HERMES_TARGET_NOT_FOUND'
              ? 'Metro attach requires a dev build with a Hermes inspector. Release/prod builds have no debuggable target.'
              : 'Ensure the app is installed and Metro is serving the correct bundle. Try `mm cleanup` then re-launch.',
        });
      }

      const live = await verifyLiveness(
        healthResult.target.webSocketDebuggerUrl,
        livenessTimeoutMs,
      );

      if (!live) {
        process.stderr.write(
          '[mm-mobile] metro-attach: JS liveness probe failed or unavailable, proceeding with target-presence-only health\n',
        );
      }

      process.stderr.write(
        `[mm-mobile] metro-attach: Hermes target healthy, attach complete\n`,
      );

      return {
        pinnedDeviceId: healthResult.pinnedDeviceId,
      };
    }

    process.stderr.write(
      `[mm-mobile] metro-attach: Metro not ready within ${metroReadyTimeoutMs}ms on attempt ${attempt}\n`,
    );

    if (attempt < maxAttempts) {
      const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;
      await sleep(retryDelayMs);
    }
  }

  throw new IOSLaunchError({
    code: 'MM_INVALID_CONFIG',
    message: `Metro watch-mode attach failed after ${maxAttempts} attempts (port ${options.metroPort})`,
    remediation:
      'Ensure `yarn watch:clean` is running and the Metro bundler is responsive. Try `mm cleanup` then re-launch.',
  });
}

async function waitForMetroReady(
  statusUrl: string,
  timeoutMs: number,
  fetchFn: typeof fetch,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      const response = await fetchFn(statusUrl, {
        signal: AbortSignal.timeout(2_000),
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
