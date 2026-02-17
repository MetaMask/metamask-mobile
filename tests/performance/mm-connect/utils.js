/* eslint-disable import/no-nodejs-modules */
import { execSync } from 'child_process';

// Default port for the browser playground dapp server
const DEFAULT_DAPP_PORT = 8090;

const DAPP_READY_POLL_MS = 500;

/**
 * Wait for the dapp server to be listening on the given port (e.g. after start()).
 * Polls from the runner so we only proceed when the server is ready; helps avoid
 * navigating to the dapp before it is reachable (e.g. on CI with BrowserStack Local).
 * @param {number} port - The port the dapp server is running on
 * @param {number} timeoutMs - Max time to wait (default 15s)
 * @throws {Error} If the server does not respond within timeoutMs
 */
export async function waitForDappServerReady(port, timeoutMs = 15000) {
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
    await new Promise((r) => setTimeout(r, DAPP_READY_POLL_MS));
  }
  throw new Error(
    `Dapp server on port ${port} did not become ready within ${timeoutMs}ms`,
  );
}

/**
 * Get the dapp URL for mobile browser access.
 * Android emulator browser needs 10.0.2.2 to reach the host machine.
 * @param {string} platform - 'android' or 'ios'
 * @param {number} port - The port the dapp server is running on
 * @returns {string} The URL to access the dapp
 */
export function getDappUrlForBrowser(platform, port = DEFAULT_DAPP_PORT) {
  const host = platform === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${port}`;
}

/**
 * Set up ADB reverse port forwarding for Android emulator.
 * This allows the emulator to access localhost:{port} via 10.0.2.2:{port}
 * @param {number} port - The port to forward
 */
export function setupAdbReverse(port) {
  try {
    execSync(`adb reverse tcp:${port} tcp:${port}`, { stdio: 'pipe' });
    console.log(`ADB reverse port ${port} configured`);
  } catch (error) {
    // ADB might not be available (e.g., on iOS-only runs)
    console.warn(
      `Could not set up ADB reverse (may be expected on iOS): ${error.message}`,
    );
  }
}

/**
 * Clean up ADB reverse port forwarding.
 * @param {number} port - The port to remove forwarding for
 */
export function cleanupAdbReverse(port) {
  try {
    execSync(`adb reverse --remove tcp:${port}`, { stdio: 'pipe' });
    console.log(`ADB reverse port ${port} removed`);
  } catch {
    // Ignore cleanup errors
  }
}
