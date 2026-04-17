/* eslint-disable import-x/no-nodejs-modules */
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import LoginView from '../../page-objects/wallet/LoginView';
import WalletView from '../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import {
  PlaywrightGestures,
  PlaywrightAssertions,
  sleep,
  createLogger,
} from '../../framework';
import { asPlaywrightElement } from '../../framework/EncapsulatedElement';
import { loginToAppPlaywright } from '../../flows/wallet.flow';
import { PLAYGROUND_PACKAGE_ID } from '../../framework/Constants';
import type { CurrentDeviceDetails } from '../../framework/fixture';

const logger = createLogger({
  name: 'MMConnectUtils',
});

// Default port for the browser playground dapp server
const DEFAULT_DAPP_PORT = 8090;

const UNLOCK_WAIT_MS = 5000;

/**
 * If the app auto-locked and the unlock/login screen is displayed, enter password and unlock.
 * Waits no more than 3 seconds for the unlock screen; if not visible, returns without action.
 * Call from native context before interacting with connection/sign modals.
 */
export async function unlockIfLockScreenVisible(): Promise<void> {
  try {
    await PlaywrightAssertions.expectElementToBeVisible(
      asPlaywrightElement(LoginView.container),
      { timeout: UNLOCK_WAIT_MS },
    );
    await loginToAppPlaywright();
  } catch {
    // Unlock screen not shown within timeout; continue
  }
}

const DAPP_READY_POLL_MS = 500;

/**
 * Wait for the dapp server to be listening on the given port (e.g. after start()).
 * Polls from the runner so we only proceed when the server is ready; helps avoid
 * navigating to the dapp before it is reachable (e.g. on CI with BrowserStack Local).
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
 * Android emulator browser needs 10.0.2.2 to reach the host machine.
 */
export function getDappUrlForBrowser(
  platform: string,
  port = DEFAULT_DAPP_PORT,
): string {
  const host = platform === 'android' ? '10.0.2.2' : 'localhost';
  return `http://${host}:${port}`;
}

/**
 * Set up ADB reverse port forwarding for Android emulator.
 * This allows the emulator to access localhost:{port} via 10.0.2.2:{port}
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

// Candidate paths for the playground release APK, checked in priority order:
// 1. Explicitly set via RN_PLAYGROUND_APK_PATH env var
// 2. Downloaded by scripts/fetch-rn-playground-apk.sh
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
 * Must be called after login.
 */
export async function ensureAccountGroupsFinishedLoading(
  currentDeviceDetails: CurrentDeviceDetails,
): Promise<void> {
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(WalletView.container),
    { timeout: 15000 },
  );
  await PlaywrightGestures.terminateApp(currentDeviceDetails);
  await PlaywrightGestures.activateApp(currentDeviceDetails);
  await loginToAppPlaywright();
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(WalletView.container),
    { timeout: 15000 },
  );
  await WalletView.tapIdenticon();
  await AccountListBottomSheet.waitForAccountSyncToComplete();
  await PlaywrightGestures.terminateApp(currentDeviceDetails);
  await PlaywrightGestures.activateApp(currentDeviceDetails);
  await loginToAppPlaywright();
  await PlaywrightAssertions.expectElementToBeVisible(
    asPlaywrightElement(WalletView.container),
    { timeout: 15000 },
  );
}

/**
 * Ensure the React Native playground release APK is installed on the
 * connected emulator. Uninstalls any existing version first, then installs
 * the pre-built release APK so the device always has a clean copy.
 */
export function ensurePlaygroundInstalled(
  currentDeviceDetails: CurrentDeviceDetails,
): void {
  if (currentDeviceDetails.isBrowserstack) {
    logger.info(
      "Playground should've been uploaded to BrowserStack before the test run",
    );
    return;
  }

  const apkPath = resolvePlaygroundApkPath();
  logger.info(`Resolved playground APK path: ${apkPath}`);

  // Uninstall any existing version (debug or release) to guarantee a clean state
  try {
    execSync(`adb uninstall ${PLAYGROUND_PACKAGE_ID}`, { stdio: 'pipe' });
    logger.info(`Uninstalled existing ${PLAYGROUND_PACKAGE_ID}`);
  } catch {
    // Package was not installed; nothing to uninstall
  }

  logger.info(`Installing playground release APK from ${apkPath}...`);
  try {
    execSync(`adb install "${apkPath}"`, { stdio: 'pipe' });
    logger.info('Playground APK installed successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to install playground APK: ${message}`);
  }
}
