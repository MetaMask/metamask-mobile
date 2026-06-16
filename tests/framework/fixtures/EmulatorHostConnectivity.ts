/* eslint-disable import-x/no-nodejs-modules */
import { exec } from 'child_process';
import http from 'http';
import { promisify } from 'util';
import { createLogger } from '../logger.ts';
import {
  FALLBACK_FIXTURE_SERVER_PORT,
  FALLBACK_MOCKSERVER_PORT,
} from '../Constants.ts';
import { DEFAULT_ANVIL_PORT } from '../../seeder/anvil-manager.ts';

const execAsync = promisify(exec);

const logger = createLogger({
  name: 'EmulatorHostConnectivity',
});

export const OFFLINE_MODE_TITLE = "You're offline";
export const OFFLINE_MODE_BODY_FRAGMENT =
  'Unable to connect to the blockchain host';

const MOCK_SERVER_HEALTH_PATH = '/health-check';
const CONNECTIVITY_PROBE_TIMEOUT_MS = 8_000;

export class OfflineModeGuardError extends Error {
  constructor(context: string) {
    super(
      `App is on OfflineMode screen ("${OFFLINE_MODE_BODY_FRAGMENT}") ${context}. ` +
        'The emulator likely cannot reach the E2E mock server or local blockchain host. ' +
        'Check adb reverse port forwarding, mock server health, and emulator network.',
    );
    this.name = 'OfflineModeGuardError';
  }
}

export function buildAdbDeviceFlag(udid?: string): string {
  const serial = udid?.trim() || process.env.ANDROID_SERIAL?.trim();
  return serial ? `-s ${serial}` : '';
}

export function parseAdbDevicesOutput(output: string): string[] {
  return output
    .split('\n')
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial, state] = line.split(/\s+/);
      return state === 'device' ? serial : '';
    })
    .filter(Boolean);
}

export function isSuccessfulHealthCheckBody(body: string): boolean {
  const normalized = body.trim();
  return (
    normalized.length > 0 &&
    (normalized.includes('Mock server is running') ||
      normalized === 'ok' ||
      normalized === 'OK')
  );
}

async function fetchHostHealthCheck(port: number): Promise<void> {
  const url = `http://127.0.0.1:${port}${MOCK_SERVER_HEALTH_PATH}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    CONNECTIVITY_PROBE_TIMEOUT_MS,
  );

  try {
    const response = await fetch(url, { signal: controller.signal });
    const body = await response.text();
    if (!response.ok || !isSuccessfulHealthCheckBody(body)) {
      throw new Error(
        `Host mock server health check failed at ${url} (status ${response.status}, body: ${body.slice(0, 120)})`,
      );
    }
    logger.debug(`Host mock server healthy at ${url}`);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function adbShellHttpGet(url: string, udid?: string): Promise<string> {
  const deviceFlag = buildAdbDeviceFlag(udid);
  const escapedUrl = url.replace(/"/g, '\\"');
  const commands = [
    `adb ${deviceFlag} shell curl -sSf --max-time 5 "${escapedUrl}"`,
    `adb ${deviceFlag} shell wget -qO- --timeout=5 "${escapedUrl}"`,
  ];

  let lastError: Error | undefined;
  for (const command of commands) {
    try {
      const { stdout, stderr } = await execAsync(command);
      if (stderr?.trim()) {
        logger.debug(`adb shell stderr for ${url}: ${stderr.trim()}`);
      }
      return stdout;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw new Error(
    `Emulator HTTP probe failed for ${url}: ${lastError?.message ?? 'unknown error'}`,
  );
}

async function verifyAndroidEmulatorMockServerReachability(
  mockServerPort: number,
  udid?: string,
): Promise<void> {
  const deviceFlag = buildAdbDeviceFlag(udid);
  const reverseList = await execAsync(`adb ${deviceFlag} reverse --list`);
  const expectedReverse = `tcp:${FALLBACK_MOCKSERVER_PORT} tcp:${mockServerPort}`;
  if (!reverseList.stdout.includes(expectedReverse)) {
    throw new Error(
      `Missing adb reverse mapping for mock server (${expectedReverse}). Current mappings:\n${reverseList.stdout || '(none)'}`,
    );
  }

  const reversedUrl = `http://127.0.0.1:${FALLBACK_MOCKSERVER_PORT}${MOCK_SERVER_HEALTH_PATH}`;
  const directHostUrl = `http://10.0.2.2:${mockServerPort}${MOCK_SERVER_HEALTH_PATH}`;

  const errors: string[] = [];
  for (const url of [reversedUrl, directHostUrl]) {
    try {
      const body = await adbShellHttpGet(url, udid);
      if (!isSuccessfulHealthCheckBody(body)) {
        throw new Error(`unexpected body: ${body.slice(0, 120)}`);
      }
      logger.debug(`Android emulator reached mock server via ${url}`);
      return;
    } catch (error) {
      errors.push(
        `${url}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  throw new Error(
    `Android emulator could not reach mock server on host port ${mockServerPort}. Attempts:\n${errors.join('\n')}`,
  );
}

async function verifyAndroidDeviceReady(udid?: string): Promise<void> {
  const deviceFlag = buildAdbDeviceFlag(udid);
  const devices = parseAdbDevicesOutput(
    (await execAsync('adb devices')).stdout,
  );

  if (udid) {
    if (!devices.includes(udid)) {
      throw new Error(
        `Expected Android device ${udid} to be online, found: ${devices.join(', ') || '(none)'}`,
      );
    }
  } else if (devices.length === 0) {
    throw new Error('No online Android devices found (adb devices)');
  }

  const bootCompleted = (
    await execAsync(`adb ${deviceFlag} shell getprop sys.boot_completed`)
  ).stdout.trim();
  if (bootCompleted !== '1') {
    throw new Error(
      `Android emulator not fully booted (sys.boot_completed=${bootCompleted || 'empty'})`,
    );
  }
}

export interface VerifyE2eHostConnectivityOptions {
  mockServerPort: number;
  platform: 'android' | 'ios';
  udid?: string;
  skipAndroidEmulatorProbe?: boolean;
}

/**
 * Verifies the E2E mock server is healthy on the host and, on Android,
 * reachable from the emulator via adb reverse / 10.0.2.2 before app launch.
 */
export async function verifyE2eHostConnectivity(
  options: VerifyE2eHostConnectivityOptions,
): Promise<void> {
  if (process.env.SKIP_E2E_CONNECTIVITY_VERIFY === 'true') {
    logger.warn(
      'Skipping E2E connectivity verification (SKIP_E2E_CONNECTIVITY_VERIFY=true)',
    );
    return;
  }

  const { mockServerPort, platform, udid, skipAndroidEmulatorProbe } = options;

  await fetchHostHealthCheck(mockServerPort);

  if (platform === 'android') {
    await verifyAndroidDeviceReady(udid);
    if (!skipAndroidEmulatorProbe) {
      await verifyAndroidEmulatorMockServerReachability(mockServerPort, udid);
    }
  }
}

export interface AppiumRunnerConnectivityOptions {
  platform: 'android' | 'ios';
  udid?: string;
}

/**
 * Lightweight CI preflight before Playwright starts (no mock server yet).
 * Validates emulator/simulator plumbing that later E2E runs depend on.
 */
export async function verifyAppiumRunnerConnectivity(
  options: AppiumRunnerConnectivityOptions,
): Promise<void> {
  if (process.env.SKIP_E2E_CONNECTIVITY_VERIFY === 'true') {
    console.log('Skipping Appium runner connectivity check');
    return;
  }

  if (options.platform === 'android') {
    await verifyAndroidDeviceReady(options.udid);
    await verifyAndroidAdbReverseRoundTrip(options.udid);
    return;
  }

  await verifyIosSimulatorBooted(options.udid);
}

async function verifyAndroidAdbReverseRoundTrip(udid?: string): Promise<void> {
  const deviceFlag = buildAdbDeviceFlag(udid);
  const probePort = 18_765;
  const probePath = '/appium-connectivity-probe';
  const server = await new Promise<http.Server>((resolve, reject) => {
    const created = http.createServer((req, res) => {
      if (req.url === probePath) {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('ok');
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });
    created.once('error', reject);
    created.listen(probePort, '127.0.0.1', () => resolve(created));
  });

  try {
    await execAsync(
      `adb ${deviceFlag} reverse tcp:${probePort} tcp:${probePort}`,
    );
    const body = await adbShellHttpGet(
      `http://127.0.0.1:${probePort}${probePath}`,
      udid,
    );
    if (!isSuccessfulHealthCheckBody(body)) {
      throw new Error(`Unexpected probe response: ${body}`);
    }
    logger.info('Android adb reverse round-trip probe succeeded');
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    try {
      await execAsync(`adb ${deviceFlag} reverse --remove tcp:${probePort}`);
    } catch {
      // best effort cleanup
    }
  }
}

async function verifyIosSimulatorBooted(udid?: string): Promise<void> {
  try {
    const { stdout } = await execAsync('xcrun simctl list devices booted');
    const bootedLines = stdout
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.includes('(Booted)'));

    if (bootedLines.length === 0) {
      throw new Error('No booted iOS simulator found');
    }

    if (udid && !bootedLines.some((line) => line.includes(udid))) {
      throw new Error(
        `Booted simulator ${udid} not found. Booted devices:\n${bootedLines.join('\n')}`,
      );
    }

    logger.info(
      `Booted iOS simulator detected: ${bootedLines[0]?.split('(')[0]?.trim()}`,
    );
  } catch (error) {
    throw new Error(
      `iOS simulator preflight failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export const E2E_FALLBACK_PORTS_FOR_DIAGNOSTICS = {
  mockServer: FALLBACK_MOCKSERVER_PORT,
  fixtureServer: FALLBACK_FIXTURE_SERVER_PORT,
  anvil: DEFAULT_ANVIL_PORT,
} as const;
