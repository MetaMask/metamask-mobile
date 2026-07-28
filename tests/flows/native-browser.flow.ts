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

/** Extra settle after VIEW-intent navigation so Chrome can finish loading the dapp. */
const CHROME_VIEW_INTENT_SETTLE_MS = 3000;

/**
 * Dismisses common Chrome first-run / privacy / default-browser dialogs if present.
 * Avoid "More" — it expands FRE options rather than dismissing them.
 *
 * Best-effort and self-bounding: each selector is probed with a cheap presence
 * count (no polling) and only tapped when present, so absent dialogs cost
 * near nothing. A single absolute deadline caps total time. Deliberately NOT
 * wrapped in withTimeout by callers — Promise.race cannot cancel WebDriver
 * commands, so a raced-out dismissal would keep polling the session in the
 * background and pile up.
 * @param deadlineMs - Absolute time (Date.now() ms) after which to stop.
 * @returns void
 */
const dismissChromeAdPrivacyIfPresent = async (
  deadlineMs: number = Date.now() + CHROME_DISMISS_TIMEOUT_MS,
) => {
  const dismissTexts = [
    'Got it',
    'No thanks',
    'Skip',
    'Continue',
    'Accept & continue',
    'Accept and continue',
    'Use without an account',
  ];
  for (const text of dismissTexts) {
    if (Date.now() > deadlineMs) {
      return;
    }
    if ((await PlaywrightMatchers.countElementsByText(text, true)) === 0) {
      continue;
    }
    const dismissControl = await PlaywrightMatchers.getElementByText(
      text,
      true,
    );
    await PlaywrightGestures.waitAndTap(dismissControl, { timeout: 1500 });
    return;
  }
};

/**
 * Dismisses the "Chrome notifications make things easier" modal if present.
 * Prefer text — resource IDs differ across Chrome versions on emulators.
 * @returns void
 */
const dismissChromeNotificationsIfPresent = async () => {
  if ((await PlaywrightMatchers.countElementsByText('No thanks')) === 0) {
    return;
  }
  const noThanks = await PlaywrightMatchers.getElementByText('No thanks');
  await PlaywrightGestures.waitAndTap(noThanks, { timeout: 1500 });
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
    await dismissChromeAdPrivacyIfPresent();
  } catch {
    // No Enhanced ad privacy dialog — continue
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
 * Wait until Chrome NTP/omnibox is interactable, dismissing leftover dialogs.
 * google_apis emulator Chrome often uses placeholder text instead of stable IDs.
 * @throws If Chrome never becomes ready within the timeout
 */
const waitForChromeNavigationReady = async () => {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    PlaywrightUtilities.collapseStatusBar();
    try {
      await withTimeout(
        dismissChromeNotificationsIfPresent(),
        2_000,
        'dismissChromeNotificationsReady',
      );
    } catch {
      // Modal not present
    }

    for (const probe of [
      () => asPlaywrightElement(ChromeBrowserView.chromeHomePageSearchBox),
      () => asPlaywrightElement(ChromeBrowserView.chromeUrlBar),
      () =>
        PlaywrightMatchers.getElementByText('Search or type web address', true),
    ]) {
      try {
        const chromeTarget = await probe();
        if (await chromeTarget.isVisible()) {
          return;
        }
      } catch {
        // Try next probe
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(
    'Chrome navigation UI (NTP/omnibox) did not become ready within 20s',
  );
};

/**
 * Returns true when the Chrome URL bar appears to show the target URL.
 */
const chromeUrlBarShowsTarget = async (url: string): Promise<boolean> => {
  try {
    const urlBar = await asPlaywrightElement(ChromeBrowserView.chromeUrlBar);
    if (!(await urlBar.isVisible())) {
      return false;
    }
    const shown =
      (await urlBar.getText()) || (await urlBar.getAttribute('text')) || '';
    let needle = url;
    try {
      needle = new URL(url).hostname;
    } catch {
      // Use the raw URL string when parsing fails
    }
    return (
      needle.length > 0 && shown.toLowerCase().includes(needle.toLowerCase())
    );
  } catch {
    return false;
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

  // Clear before disable-fre so the next cold start picks up chrome-command-line.
  PlaywrightUtilities.clearChromeData();
  PlaywrightUtilities.setupChromeDisableFre();
  PlaywrightUtilities.grantChromeNotificationPermission();
  PlaywrightUtilities.forceStopChrome();

  await PlaywrightGestures.activateApp(undefined, CHROME_PACKAGE);
  if (safelyOnboardChrome) {
    await safelyOnboardChromeBrowser();
  }
  await waitForChromeNavigationReady();
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
  PlaywrightUtilities.collapseStatusBar();

  // Prefer VIEW intent — omnibox IDs/text are unreliable on fresh google_apis Chrome.
  try {
    PlaywrightUtilities.openUrlInChrome(url);
    await new Promise((r) => setTimeout(r, CHROME_VIEW_INTENT_SETTLE_MS));
    try {
      await dismissChromeAdPrivacyIfPresent();
    } catch {
      // No post-navigation dialog
    }
    // Skip omnibox only when the URL bar confirms the VIEW intent succeeded.
    // Missing NTP alone is not enough (error/blank/dialog screens also hide it).
    if (await chromeUrlBarShowsTarget(url)) {
      return;
    }
  } catch {
    // Fall back to omnibox UI navigation
  }

  try {
    await ChromeBrowserView.tapSearchBox();
  } catch {
    try {
      // Newer Chrome on google_apis images may not expose search_box_text.
      await PlaywrightGestures.waitAndTap(
        await PlaywrightMatchers.getElementByText(
          'Search or type web address',
          true,
        ),
      );
    } catch {
      // NTP search box not present — tap URL bar directly
    }
  }
  try {
    await ChromeBrowserView.tapUrlBar();
  } catch {
    // Omnibox may already be focused after tapping the search placeholder.
  }

  try {
    await PlaywrightGestures.typeText(
      await asPlaywrightElement(ChromeBrowserView.chromeUrlBar),
      url,
    );
  } catch {
    const editText = await PlaywrightMatchers.getElementByXPath(
      '//android.widget.EditText',
    );
    await PlaywrightGestures.typeText(editText, url);
  }
  try {
    await ChromeBrowserView.tapSelectDappUrl();
  } catch {
    // Suggestion row resource IDs vary; Enter submits the omnibox URL.
    await PlaywrightGestures.submitAndroidUrlBar();
  }
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
