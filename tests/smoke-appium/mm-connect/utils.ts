/* eslint-disable import-x/no-nodejs-modules */
import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { sleep, createLogger } from '../../framework';
import { PLAYGROUND_PACKAGE_ID } from '../../framework/Constants';
import type { CurrentDeviceDetails } from '../../framework/fixtures/playwright';
import {
  adbDeviceArgs,
  hostListenPortForDevicePort,
} from '../../framework/e2eWorkerPorts.ts';

const logger = createLogger({
  name: 'MMConnectUtils',
});

const DEFAULT_DAPP_PORT = 8090;
const DAPP_READY_POLL_MS = 500;

/**
 * Wait for the dapp server to be listening on the given port.
 */
export async function waitForDappServerReady(
  port: number,
  timeoutMs = 15000,
): Promise<void> {
  const url = `http://localhost:${port}`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok || res.status < 500) {
        return;
      }
    } catch {
      // Server not ready or connection refused; keep polling
    }
    await sleep(DAPP_READY_POLL_MS);
  }
  throw new Error(
    `Dapp server on port ${port} did not become ready within ${timeoutMs}ms`,
  );
}

/**
 * Get the dapp URL for mobile browser access.
 * Uses localhost on both platforms. On Android, pair with {@link setupAdbReverse}
 * so the emulator reaches the host dapp server (preferred over 10.0.2.2 for
 * stable URL / CDP matching).
 */
export function getDappUrlForBrowser(
  _platform: string,
  port = DEFAULT_DAPP_PORT,
): string {
  return `http://localhost:${port}`;
}

/**
 * Set up ADB reverse so the emulator's `devicePort` reaches `hostPort` on the
 * worker host. Worker 1 listens on a shifted host port to avoid EADDRINUSE.
 */
export function setupAdbReverse(
  devicePort: number,
  hostPort: number = devicePort,
): void {
  const deviceArgs = adbDeviceArgs();
  try {
    execFileSync(
      'adb',
      [...deviceArgs, 'reverse', `tcp:${devicePort}`, `tcp:${hostPort}`],
      { stdio: 'pipe' },
    );
    logger.info(`ADB reverse tcp:${devicePort} → tcp:${hostPort} configured`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (deviceArgs.length > 0) {
      throw new Error(
        `Could not set up ADB reverse tcp:${devicePort} → tcp:${hostPort}: ${message}`,
      );
    }
    logger.warn(
      `Could not set up ADB reverse (may be expected on iOS): ${message}`,
    );
  }
}

/**
 * Clean up ADB reverse port forwarding for the device-facing port.
 */
export function cleanupAdbReverse(devicePort: number): void {
  try {
    execFileSync(
      'adb',
      [...adbDeviceArgs(), 'reverse', '--remove', `tcp:${devicePort}`],
      { stdio: 'pipe' },
    );
    logger.info(`ADB reverse port ${devicePort} removed`);
  } catch {
    // Ignore cleanup errors
  }
}

export async function startLocalDappServerOnWorker(
  server: {
    setServerPort: (port: number) => void;
    start: () => Promise<void>;
    stop: () => Promise<void>;
  },
  devicePort: number,
): Promise<void> {
  const hostPort = hostListenPortForDevicePort(devicePort);
  server.setServerPort(hostPort);
  await server.start();
  await waitForDappServerReady(hostPort);
  try {
    setupAdbReverse(devicePort, hostPort);
  } catch (error) {
    await server.stop();
    throw error;
  }
}

export async function stopLocalDappServerOnWorker(
  server: { stop: () => Promise<void> },
  devicePort: number,
): Promise<void> {
  cleanupAdbReverse(devicePort);
  await server.stop();
}

// Candidate paths for the playground release APK, checked in priority order:
// 1. Explicitly set via RN_PLAYGROUND_APK_PATH env var
// 2. Downloaded by tests/scripts/fetch-rn-playground-apk.sh
// 3. Locally built in sibling connect-monorepo
const PLAYGROUND_APK_CANDIDATES = [
  process.env.RN_PLAYGROUND_APK_PATH,
  './tmp/rn-playground.apk',
  '../connect-monorepo/playground/react-native-playground/android/app/build/outputs/apk/release/app-release.apk',
].filter(Boolean) as string[];

/**
 * Resolve the playground APK path from the candidate list.
 */
function resolvePlaygroundApkPath(): string {
  for (const candidate of PLAYGROUND_APK_CANDIDATES) {
    const resolved = path.resolve(process.cwd(), candidate);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  throw new Error(
    'Playground release APK not found. Checked:\n' +
      PLAYGROUND_APK_CANDIDATES.map(
        (p) => `  - ${path.resolve(process.cwd(), p)}`,
      ).join('\n') +
      '\n\nTo fix this, either:\n' +
      '  1. Run: ./tests/scripts/fetch-rn-playground-apk.sh\n' +
      '     (downloads the latest APK from connect-monorepo GitHub Releases)\n' +
      '  2. Build locally:\n' +
      '     cd connect-monorepo && yarn install && yarn build\n' +
      '     cd playground/react-native-playground && npx expo prebuild --platform android\n' +
      '     cd android && ./gradlew assembleRelease\n' +
      '  3. Set RN_PLAYGROUND_APK_PATH to the APK location\n\n' +
      'See tests/smoke-appium/mm-connect/README.md for full setup instructions.',
  );
}

/**
 * Ensure the React Native playground release APK is installed on the
 * connected emulator. Uninstalls any existing version first, then installs
 * the pre-built release APK so the device always has a clean copy.
 */
export function ensurePlaygroundInstalled(
  _currentDeviceDetails: CurrentDeviceDetails,
): void {
  const apkPath = resolvePlaygroundApkPath();
  logger.info(`Resolved playground APK path: ${apkPath}`);

  // Uninstall any existing version (debug or release) to guarantee a clean state
  try {
    execFileSync(
      'adb',
      [...adbDeviceArgs(), 'uninstall', PLAYGROUND_PACKAGE_ID],
      {
        stdio: 'pipe',
      },
    );
    logger.info(`Uninstalled existing ${PLAYGROUND_PACKAGE_ID}`);
  } catch {
    // Package was not installed; nothing to uninstall
  }

  logger.info(`Installing playground release APK from ${apkPath}...`);
  try {
    execFileSync('adb', [...adbDeviceArgs(), 'install', apkPath], {
      stdio: 'pipe',
    });
    logger.info('Playground APK installed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install playground APK: ${message}`);
  }
}
