/* eslint-disable import-x/no-nodejs-modules */
import { execSync } from 'child_process';
import { sleep, createLogger } from '../../framework';

export { unlockIfLockScreenVisible } from '../../page-objects/MMConnect/unlockHelpers';

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
 * Set up ADB reverse port forwarding for Android emulator.
 */
export function setupAdbReverse(port: number): void {
  try {
    execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: 'pipe' });
    logger.info(`ADB reverse port ${port} configured`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      `Could not set up ADB reverse (may be expected on iOS): ${message}`,
    );
  }
}

/**
 * Clean up ADB reverse port forwarding.
 */
export function cleanupAdbReverse(port: number): void {
  try {
    execSync(`adb reverse --remove tcp:${port}`, { stdio: 'pipe' });
    logger.info(`ADB reverse port ${port} removed`);
  } catch {
    // Ignore cleanup errors
  }
}
