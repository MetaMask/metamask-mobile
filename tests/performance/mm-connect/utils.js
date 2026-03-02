/* eslint-disable import/no-nodejs-modules */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { expect } from 'appwright';
import LoginScreen from '../../../wdio/screen-objects/LoginScreen.js';
import WalletMainScreen from '../../../wdio/screen-objects/WalletMainScreen.js';
import AccountListComponent from '../../../wdio/screen-objects/AccountListComponent.js';
import AppwrightGestures from '../../framework/AppwrightGestures.ts';
import { login } from '../../framework/utils/Flows.js';
import { PLAYGROUND_PACKAGE_ID } from '../../framework/Constants.ts';

// Default port for the browser playground dapp server
const DEFAULT_DAPP_PORT = 8090;

const UNLOCK_WAIT_MS = 3000;

/**
 * If the app auto-locked and the unlock/login screen is displayed, enter password and unlock.
 * Waits no more than 3 seconds for the unlock screen; if not visible, returns without action.
 * Reuses the same login flow (password source, type, tap Unlock) as the start-of-test login.
 * Call from native context (e.g. inside withNativeAction) before interacting with connection/sign modals.
 * @param {import('appwright').Device} device - Appwright device
 */
export async function unlockIfLockScreenVisible(device) {
  LoginScreen.device = device;
  try {
    const title = await LoginScreen.title;
    await expect(title).toBeVisible({ timeout: UNLOCK_WAIT_MS });
    await login(device);
  } catch {
    // Unlock screen not shown within timeout; continue
  }
}

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

// Candidate paths for the playground release APK, checked in priority order:
// 1. Explicitly set via RN_PLAYGROUND_APK_PATH env var
// 2. Downloaded by scripts/fetch-rn-playground-apk.sh
// 3. Locally built in sibling connect-monorepo
const PLAYGROUND_APK_CANDIDATES = [
  process.env.RN_PLAYGROUND_APK_PATH,
  './tmp/rn-playground.apk',
  '../connect-monorepo/playground/react-native-playground/android/app/build/outputs/apk/release/app-release.apk',
].filter(Boolean);

/**
 * Resolve the playground APK path from the candidate list.
 * @returns {string} Absolute path to the APK
 * @throws {Error} If no candidate exists on disk
 */
function resolvePlaygroundApkPath() {
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
      '  1. Run: ./scripts/fetch-rn-playground-apk.sh\n' +
      '     (downloads the latest APK from connect-monorepo GitHub Releases)\n' +
      '  2. Build locally:\n' +
      '     cd connect-monorepo && yarn install && yarn build\n' +
      '     cd playground/react-native-playground && npx expo prebuild --platform android\n' +
      '     cd android && ./gradlew assembleRelease\n' +
      '  3. Set RN_PLAYGROUND_APK_PATH to the APK location\n\n' +
      'See tests/performance/mm-connect/README.md for full setup instructions.',
  );
}

/**
 * Wait for the wallet to be visible, then cycle the app twice to ensure all
 * account groups (including Solana) are created and syncing completes.
 * Must be called from native context after login.
 * @param {import('appwright').Device} device - Appwright device
 */
export async function ensureAccountGroupsFinishedLoading(device) {
  await WalletMainScreen.isMainWalletViewVisible();
  await AppwrightGestures.terminateApp(device);
  await AppwrightGestures.activateApp(device);
  await login(device);
  await WalletMainScreen.isMainWalletViewVisible();
  await WalletMainScreen.tapIdenticon();
  await AccountListComponent.isComponentDisplayed();
  await AccountListComponent.waitForSyncingToComplete();
  await AppwrightGestures.terminateApp(device);
  await AppwrightGestures.activateApp(device);
  await login(device);
  await WalletMainScreen.isMainWalletViewVisible();
}

/**
 * Ensure the React Native playground release APK is installed on the
 * connected emulator. Uninstalls any existing version first, then installs
 * the pre-built release APK so the device always has a clean copy.
 *
 * The APK is resolved from (in priority order):
 *   1. RN_PLAYGROUND_APK_PATH env var
 *   2. ./tmp/rn-playground.apk (downloaded via fetch-rn-playground-apk.sh)
 *   3. Sibling connect-monorepo local build
 *
 * @throws {Error} If the APK file is not found or adb install fails.
 */
export function ensurePlaygroundInstalled() {
  const apkPath = resolvePlaygroundApkPath();

  // Uninstall any existing version (debug or release) to guarantee a clean state
  try {
    execSync(`adb uninstall ${PLAYGROUND_PACKAGE_ID}`, { stdio: 'pipe' });
    console.log(`Uninstalled existing ${PLAYGROUND_PACKAGE_ID}`);
  } catch {
    // Package was not installed; nothing to uninstall
  }

  console.log(`Installing playground release APK from ${apkPath}...`);
  try {
    execSync(`adb install "${apkPath}"`, { stdio: 'pipe' });
    console.log('Playground APK installed successfully');
  } catch (error) {
    throw new Error(`Failed to install playground APK: ${error.message}`);
  }
}
