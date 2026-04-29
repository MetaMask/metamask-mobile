import {
  asPlaywrightElement,
  PlatformDetector,
  PlaywrightGestures,
  PlaywrightMatchers,
} from '../framework';
import { CHROME_PACKAGE } from '../framework/Constants';
import PlaywrightUtilities, {
  withTimeout,
} from '../framework/PlaywrightUtilities';
import ChromeBrowserView from '../page-objects/Native/ChromeBrowserView';

/** Max time to wait for a Chrome modal dismissal (find + tap). Prevents long hangs. */
const CHROME_DISMISS_TIMEOUT_MS = 5000;

/** Delay after dismissals so Chrome UI can settle before we interact with the URL bar. Kept short to avoid app auto-lock. */
const CHROME_UI_SETTLE_MS = 800;

/**
 * Dismisses the "Enhanced ad privacy" dialog if present.
 * @returns void
 */
const dismissChromeAdPrivacyIfPresent = async () => {
  const dismissTexts = ['Got it', 'No thanks', 'Skip', 'Continue'];
  for (const text of dismissTexts) {
    try {
      const element = await PlaywrightMatchers.getElementByText(text);
      await PlaywrightGestures.waitAndTap(element);
      return;
    } catch {
      // This text not found, try next
    }
  }
};

/**
 * Dismisses the "Chrome notifications make things easier" modal if present.
 * @returns void
 */
const dismissChromeNotificationsIfPresent = async () => {
  const element = await PlaywrightMatchers.getElementByText('No thanks');
  await PlaywrightGestures.waitAndTap(element);
};

/**
 * Safely onboard the Chrome browser
 * @returns void
 */
const safelyOnboardChromeBrowser = async () => {
  try {
    await withTimeout(
      ChromeBrowserView.tapOnboardingChromeWithoutAccount(),
      CHROME_DISMISS_TIMEOUT_MS,
      'tapOnboardingChromeWithoutAccount',
    );
  } catch {
    // No onboarding dialog or timed out
  }

  try {
    await withTimeout(
      ChromeBrowserView.tapChromeNoThanksButton(),
      CHROME_DISMISS_TIMEOUT_MS,
      'tapChromeNoThanksButton',
    );
  } catch {
    // No "No thanks" dialog or timed out
  }
  try {
    await withTimeout(
      dismissChromeAdPrivacyIfPresent(),
      CHROME_DISMISS_TIMEOUT_MS,
      'dismissChromeAdPrivacy',
    );
  } catch {
    // No Enhanced ad privacy dialog or timed out — continue
  }
  try {
    await withTimeout(
      dismissChromeNotificationsIfPresent(),
      CHROME_DISMISS_TIMEOUT_MS,
      'dismissChromeNotifications',
    );
  } catch {
    // No "Chrome notifications" modal or timed out — continue
  }
};

/**
 * Launches the mobile browser
 * @returns A promise that resolves when the launch is complete
 */
export const launchMobileBrowser = async ({
  safelyOnboardChrome = false,
}: { safelyOnboardChrome?: boolean } = {}) => {
  if (await PlatformDetector.isIOS()) {
    await PlaywrightGestures.activateApp(undefined, 'com.apple.mobilesafari');
    return;
  }

  PlaywrightUtilities.setupChromeDisableFre();
  PlaywrightUtilities.clearChromeData();

  await PlaywrightGestures.activateApp(undefined, CHROME_PACKAGE);
  if (safelyOnboardChrome) {
    await safelyOnboardChromeBrowser();
  }
  await new Promise((r) => setTimeout(r, CHROME_UI_SETTLE_MS));
};

/**
 * Switches to the mobile browser
 * @returns A promise that resolves when the switch is complete
 */
export const switchToMobileBrowser = async () => {
  if (await PlatformDetector.isIOS()) {
    await PlaywrightGestures.activateApp(undefined, 'com.apple.mobilesafari');
  } else {
    await PlaywrightGestures.activateApp(undefined, CHROME_PACKAGE);
  }
};

/**
 * Navigates to a dapp on Android
 * @param url - The URL to navigate to
 * @returns A promise that resolves when the navigation is complete
 */
export const navigateToDappAndroid = async (url: string) => {
  try {
    await ChromeBrowserView.tapSearchBox();
  } catch {
    // NTP search box not present — tap URL bar directly
  }
  await ChromeBrowserView.tapUrlBar();
  await PlaywrightGestures.typeText(
    await asPlaywrightElement(ChromeBrowserView.chromeUrlBar),
    url,
  );
  await ChromeBrowserView.tapSelectDappUrl();
};

/**
 * Navigates to a dapp on iOS
 * @param url - The URL to navigate to
 * @returns A promise that resolves when the navigation is complete
 */
export const navigateToDappIOS = async (url: string) => {
  await PlaywrightGestures.typeText(
    await asPlaywrightElement(
      PlaywrightMatchers.getElementByNameiOS('TabBarItemTitle'),
    ),
    `${url}\n`,
  );
};

/**
 * Navigates to a dapp
 * @param url - The URL to navigate to
 * @returns A promise that resolves when the navigation is complete
 */
export async function navigateToDapp(url: string) {
  if (await PlatformDetector.isAndroid()) {
    return navigateToDappAndroid(url);
  }
  if (await PlatformDetector.isIOS()) {
    return navigateToDappIOS(url);
  }
  throw new Error('Unsupported platform');
}

/**
 * Refreshes the mobile browser
 * @returns A promise that resolves when the refresh is complete
 */
export async function refreshMobileBrowser() {
  if (await PlatformDetector.isIOS()) {
    throw new Error('Not implemented');
  }

  await ChromeBrowserView.tapChromeMenuButton();
  return ChromeBrowserView.tapChromeRefreshButton();
}
