import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';
import Utilities, { sleep } from '../framework/Utilities';
import BrowserView from '../page-objects/Browser/BrowserView';
import TestDApp from '../page-objects/Browser/TestDApp';
import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import { BrowserURLBarSelectorsIDs } from '../../app/components/UI/BrowserUrlBar/BrowserURLBar.testIds';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import TrendingView from '../page-objects/Trending/TrendingView';
import {
  encapsulated,
  type EncapsulatedElementType,
} from '../framework/EncapsulatedElement';
import PlaywrightMatchers from '../framework/PlaywrightMatchers';
import { FrameworkDetector } from '../framework/FrameworkDetector';
import { PlatformDetector } from '../framework/PlatformLocator';
import PlaywrightContextHelpers from '../framework/PlaywrightContextHelpers';
import { waitForAndroidTestSnapsNativeLoad } from '../smoke-appium/snaps/helpers/android-test-snaps-native.helpers';
import { TEST_SNAPS_URL } from '../selectors/Browser/TestSnaps.selectors';
import { getDappUrl } from '../framework/fixtures/FixtureUtils';

/**
 * Waits for the test dapp to load.
 * @async
 * @function waitForTestDappToLoad
 * @returns {Promise<void>} A promise that resolves when the test dapp is loaded.
 * @throws {Error} Throws an error if the test dapp fails to load after a certain number of attempts.
 */
export const waitForTestDappToLoad = async (): Promise<void> => {
  if (FrameworkDetector.isAppium()) {
    await Assertions.expectElementToBeVisible(
      PlaywrightMatchers.getElementByText(getDappUrl(0)),
      { description: 'Browser URL bar should show test dapp URL' },
    );
    return;
  }

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await Assertions.expectElementToBeVisible(TestDApp.testDappFoxLogo, {
        description: 'Test Dapp Fox Logo should be visible',
      });
      await Assertions.expectElementToBeVisible(TestDApp.testDappPageTitle, {
        description: 'Test Dapp Page Title should be visible',
      });
      return; // Success - page is fully loaded and interactive
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Test dapp failed to load after ${MAX_RETRIES} attempts: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  throw new Error('Test dapp failed to become fully interactive');
};

/**
 * Waits for the test snaps to load.
 * @async
 * @function waitForTestSnapsToLoad
 * @returns {Promise<void>} Resolves when the test snaps are loaded.
 * @throws {Error} Throws an error if the test snaps fail to load after a certain number of attempts.
 */
export const waitForTestSnapsToLoad = async (): Promise<void> => {
  const MAX_RETRIES = 3;
  // Stable, always-present control on the test-snaps page (more reliable than #root on Android CI).
  const LOAD_INDICATOR_WEB_ID = 'connectclient-status';
  const WEBVIEW_LOAD_TIMEOUT_MS = 30_000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (PlatformDetector.isAndroidAppium()) {
        await waitForAndroidTestSnapsNativeLoad();
        return;
      }

      if (PlatformDetector.isIOSAppium()) {
        await Assertions.expectElementToBeVisible(
          Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID),
          {
            description: 'Browser WebView native container',
            timeout: WEBVIEW_LOAD_TIMEOUT_MS,
          },
        );
        await Assertions.expectTextDisplayed('Test Snaps', {
          timeout: WEBVIEW_LOAD_TIMEOUT_MS,
          description: 'Test Snaps page title should be visible',
        });
        return;
      }

      const assertLoaded = async () =>
        Assertions.expectElementToBeVisible(
          await Matchers.getElementByWebID(
            BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
            LOAD_INDICATOR_WEB_ID,
            TEST_SNAPS_URL,
          ),
          {
            description: 'Test Snaps connect button should be visible',
            timeout: WEBVIEW_LOAD_TIMEOUT_MS,
          },
        );

      await assertLoaded();
      return;
    } catch (error) {
      if (FrameworkDetector.isAppium() && attempt < MAX_RETRIES) {
        await PlaywrightContextHelpers.switchToNativeContext().catch(
          () => undefined,
        );
        await BrowserView.navigateToURL(TEST_SNAPS_URL);
        await sleep(2_000);
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(
          `Test Snaps failed to load after ${MAX_RETRIES} attempts: ${
            error instanceof Error ? error.message : 'Unknown error'
          }`,
        );
      }
    }
  }

  throw new Error('Test Snaps failed to become fully interactive.');
};

/**
 * Navigates to the browser view using the new browser flow: Explore → Trending → Browser.
 * Waits for the URL bar and the browser WebView container to be visible so that
 * subsequent WebView-based interactions (e.g. navigateToTestDApp, verifyCurrentNetworkText)
 * work reliably on all platforms (including Android CI).
 *
 * @async
 * @function navigateToBrowserView
 * @returns {Promise<void>} Resolves when navigation to browser view is complete and verified.
 * @throws {Error} Throws an error if browser view fails to load.
 *
 * @example
 * await navigateToBrowserView();
 * await Browser.navigateToTestDApp();
 * await waitForTestDappToLoad(); // optional: wait for dapp content before WebView assertions
 */
/**
 * If the "Opened tabs" grid view is shown (e.g. after tapping the browser tab icon),
 * selects the first/most recent tab so we land on the single-tab browser view.
 */
const getFirstBrowserTabInGrid = (): EncapsulatedElementType => {
  if (!FrameworkDetector.isAppium()) {
    return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_ITEM_REGEX, 0);
  }

  return encapsulated({
    detox: () =>
      Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_ITEM_REGEX, 0),
    appium: {
      // TabThumbnail sets accessibilityLabel to "Switch tab"; Android exposes it as content-desc.
      android: () =>
        PlaywrightMatchers.getElementByAndroidUIAutomator(
          '.descriptionContains("Switch tab")',
          { index: 0 },
        ),
      ios: () =>
        PlaywrightMatchers.getElementById(
          BrowserViewSelectorsIDs.TABS_ITEM_REGEX,
          { index: 0 },
        ),
    },
  });
};

export const ensureSingleBrowserTabView = async (): Promise<void> => {
  const openedTabsHeader = Matchers.getElementByID(
    BrowserViewSelectorsIDs.TABS_OPENED_TITLE,
  );
  const isInTabListView = await Utilities.isElementVisible(
    openedTabsHeader,
    2000,
  );
  if (isInTabListView) {
    const firstTab = getFirstBrowserTabInGrid();
    await Gestures.waitAndTap(firstTab, {
      elemDescription: 'First browser tab (select to open single-tab view)',
    });
  }
};

const getBrowserUrlBarVisibleIndicator = (): EncapsulatedElementType =>
  encapsulated({
    detox: () => Matchers.getElementByID(BrowserURLBarSelectorsIDs.URL_INPUT),
    appium: () =>
      // TextInput (`browser-modal-url-input`) is hidden when the URL bar is unfocused;
      // the wrapper view (`url-input`) stays visible and shows the current URL.
      PlaywrightMatchers.getElementById(BrowserViewSelectorsIDs.URL_INPUT),
  });

export const navigateToBrowserView = async (): Promise<void> => {
  await TabBarComponent.tapExploreButton();
  await TrendingView.tapBrowserButton();

  // If we landed on the "Opened tabs" grid (tab list), select the first tab to get to single-tab view
  await ensureSingleBrowserTabView();

  await Assertions.expectElementToBeVisible(
    getBrowserUrlBarVisibleIndicator(),
    {
      description: 'Browser URL bar should be visible after navigation',
      timeout: FrameworkDetector.isAppium() ? 30_000 : undefined,
    },
  );
};

export const openUrlInBrowserView = async (): Promise<void> => {
  await Gestures.waitAndTap(
    PlaywrightMatchers.getElementById(BrowserViewSelectorsIDs.URL_INPUT),
    {
      elemDescription: 'URL input box',
    },
  );
};
