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
 * @returns void
 */
const dismissChromeAdPrivacyIfPresent = async () => {
  const dismissTexts = [
    'Got it',
    'No thanks',
    'Skip',
    'Continue',
    'Accept & continue',
    'Accept and continue',
    'Use without an account',
    'More',
  ];
  for (const text of dismissTexts) {
    try {
      const dismissControl = await PlaywrightMatchers.getElementByText(text);
      await PlaywrightGestures.waitAndTap(dismissControl);
      return;
    } catch {
      // This text not found, try next
    }
  }
};

/**
 * Dismisses the "Chrome notifications make things easier" modal if present.
 * Prefer text — resource IDs differ across Chrome versions on emulators.
 * @returns void
 */
const dismissChromeNotificationsIfPresent = async () => {
  const noThanks = await PlaywrightMatchers.getElementByText('No thanks');
  await PlaywrightGestures.waitAndTap(noThanks);
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
 * Wait until Chrome NTP/omnibox is interactable, dismissing leftover dialogs.
 * google_apis emulator Chrome often uses placeholder text instead of stable IDs.
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
      await withTimeout(
        dismissChromeAdPrivacyIfPresent(),
        CHROME_DISMISS_TIMEOUT_MS,
        'dismissChromeAfterViewIntent',
      );
    } catch {
      // No post-navigation dialog
    }
    // If Chrome is still on the NTP, the intent was ignored — use omnibox.
    try {
      const ntpSearch = await PlaywrightMatchers.getElementByText(
        'Search or type web address',
        true,
      );
      if (!(await ntpSearch.isVisible())) {
        return;
      }
    } catch {
      // NTP placeholder absent — assume the dapp URL loaded.
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
