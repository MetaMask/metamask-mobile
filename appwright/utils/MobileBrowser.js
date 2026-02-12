/* eslint-disable import/no-nodejs-modules */
import { execSync } from 'child_process';

import AppwrightSelectors from '../../tests/framework/AppwrightSelectors';
import MobileBrowserScreen from '../../wdio/screen-objects/MobileBrowser.js';
import AppwrightGestures from '../../tests/framework/AppwrightGestures';

const CHROME_PACKAGE = 'com.android.chrome';

/** Max time to wait for a Chrome modal dismissal (find + tap). Prevents long hangs. */
const CHROME_DISMISS_TIMEOUT_MS = 5000;

/** Delay after dismissals so Chrome UI can settle before we interact with the URL bar. Kept short to avoid app auto-lock. */
const CHROME_UI_SETTLE_MS = 800;

/**
 * Run an async step with a timeout. Rejects after ms so callers can catch and continue.
 */
function withTimeout(promise, ms, label = 'operation') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${ms}ms`)),
        ms,
      ),
    ),
  ]);
}

/**
 * Configure Chrome to skip First Run Experience (FRE) including "Enhanced ad privacy".
 * Uses Chrome's command-line file; requires set-debug-app. Non-fatal if adb fails.
 */
function setupChromeDisableFre() {
  try {
    execSync(`adb shell am set-debug-app --persistent ${CHROME_PACKAGE}`, {
      stdio: 'pipe',
    });
  } catch (error) {
    console.warn(
      `Could not set Chrome as debug app (FRE may show): ${error.message}`,
    );
  }
  try {
    execSync(
      `adb shell "echo 'chrome --disable-fre --no-default-browser-check --no-first-run' > /data/local/tmp/chrome-command-line"`,
      { stdio: 'pipe' },
    );
  } catch (error) {
    console.warn(
      `Could not write Chrome command-line (FRE may show): ${error.message}`,
    );
  }
}

/**
 * Clear Chrome app data so it opens with a single default tab (no previous tabs).
 * Falls back to no-op if adb fails (e.g. not Android, no adb).
 */
function clearChromeData() {
  try {
    execSync(`adb shell pm clear ${CHROME_PACKAGE}`, { stdio: 'pipe' });
  } catch (error) {
    console.warn(
      `Could not clear Chrome data (Chrome may open with existing tabs): ${error.message}`,
    );
    return false;
  }
  return true;
}

/**
 * Dismiss "Enhanced ad privacy" (or similar) dialog by tapping "Got it" or alternate text.
 */
async function dismissChromeAdPrivacyIfPresent(device) {
  const dismissTexts = ['Got it', 'No thanks', 'Skip', 'Continue'];
  for (const text of dismissTexts) {
    try {
      const element = await AppwrightSelectors.getElementByText(
        device,
        text,
        false,
      );
      await AppwrightGestures.tap(element);
      return;
    } catch {
      // This text not found, try next
    }
  }
}

/**
 * Dismiss "Chrome notifications make things easier" modal by tapping "No thanks".
 */
async function dismissChromeNotificationsIfPresent(device) {
  const element = await AppwrightSelectors.getElementByText(
    device,
    'No thanks',
    false,
  );
  await AppwrightGestures.tap(element);
}

export async function launchMobileBrowser(device) {
  const isAndroid = AppwrightSelectors.isAndroid(device);
  if (isAndroid) {
    setupChromeDisableFre();
    clearChromeData();
    await device.activateApp(CHROME_PACKAGE);
    MobileBrowserScreen.device = device;
    // Dismiss first-run / sign-in prompts if present (short timeout so we don't hang)
    try {
      await withTimeout(
        MobileBrowserScreen.tapOnboardingChromeWithoutAccount(),
        CHROME_DISMISS_TIMEOUT_MS,
        'tapOnboardingChromeWithoutAccount',
      );
    } catch {
      // No onboarding dialog or timed out
    }
    try {
      await withTimeout(
        MobileBrowserScreen.tapChromeNoThanksButton(),
        CHROME_DISMISS_TIMEOUT_MS,
        'tapChromeNoThanksButton',
      );
    } catch {
      // No "No thanks" dialog or timed out
    }
    try {
      await withTimeout(
        dismissChromeAdPrivacyIfPresent(device),
        CHROME_DISMISS_TIMEOUT_MS,
        'dismissChromeAdPrivacy',
      );
    } catch {
      // No Enhanced ad privacy dialog or timed out — continue
    }
    try {
      await withTimeout(
        dismissChromeNotificationsIfPresent(device),
        CHROME_DISMISS_TIMEOUT_MS,
        'dismissChromeNotifications',
      );
    } catch {
      // No "Chrome notifications" modal or timed out — continue
    }
    await new Promise((r) => setTimeout(r, CHROME_UI_SETTLE_MS));
  } else {
    await device.activateApp('com.apple.mobilesafari');
  }
}

/**
 * Switch back to the mobile browser without clearing or re-launching.
 * Use after confirming connection in the mobile app so the existing dapp tab stays as-is.
 */
export async function switchToMobileBrowser(device) {
  const isAndroid = AppwrightSelectors.isAndroid(device);
  await device.activateApp(
    isAndroid ? CHROME_PACKAGE : 'com.apple.mobilesafari',
  );
  MobileBrowserScreen.device = device;
}

export async function navigateToDappAndroid(device, url, dappName) {
  MobileBrowserScreen.device = device;

  try {
    await MobileBrowserScreen.tapSearchBox();
  } catch {
    // NTP search box not present — tap URL bar directly
  }
  await MobileBrowserScreen.tapUrlBar();
  await AppwrightGestures.typeText(await MobileBrowserScreen.chromeUrlBar, url);
  await MobileBrowserScreen.tapSelectDappUrl();
}

export async function navigateToDappIOS(device, url, dappName) {
  throw new Error('Not implemented');
}

export async function navigateToDapp(device, url, dappName) {
  if (AppwrightSelectors.isAndroid(device)) {
    return navigateToDappAndroid(device, url, dappName);
  }
  if (AppwrightSelectors.isIOS(device)) {
    return navigateToDappIOS(device, url, dappName);
  }
  throw new Error('Unsupported platform');
}

export async function refreshMobileBrowser(device) {
  if (AppwrightSelectors.isIOS(device)) {
    throw new Error('Not implemented');
  }
  if (AppwrightSelectors.isAndroid(device)) {
    await MobileBrowserScreen.tapChromeMenuButton();
    return MobileBrowserScreen.tapChromeRefreshButton();
  }
  throw new Error('Unsupported platform');
}
