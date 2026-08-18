import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';
import Utilities, { sleep } from '../framework/Utilities';
import BrowserView from '../page-objects/Browser/BrowserView';
import TestDApp from '../page-objects/Browser/TestDApp';
import ConnectBottomSheet from '../page-objects/Browser/ConnectBottomSheet';
import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import TrendingView from '../page-objects/Trending/TrendingView';
import { PlatformDetector } from '../framework/PlatformLocator';
import PlaywrightContextHelpers from '../framework/PlaywrightContextHelpers';
import { waitForAndroidTestSnapsNativeLoad } from '../smoke-appium/snaps/helpers/android-test-snaps-native.helpers';
import { TEST_SNAPS_URL } from '../selectors/Browser/TestSnaps.selectors';
import { getDappUrl } from '../framework/fixtures/FixtureUtils';

/** Dapp <h1 id="logo-text">; always at the top of the page, unlike the action buttons. */
const TEST_DAPP_LOAD_LABEL = 'E2E Test Dapp';

/**
 * Waits for the test dapp to load.
 * @async
 * @function waitForTestDappToLoad
 * @returns {Promise<void>} A promise that resolves when the test dapp is loaded.
 * @throws {Error} Throws an error if the test dapp fails to load after a certain number of attempts.
 */
export const waitForTestDappToLoad = async (): Promise<void> => {
  if (PlatformDetector.isAndroidAppium()) {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByID(BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID),
      {
        description: 'Browser WebView native container',
        timeout: 30_000,
      },
    );
    await Assertions.expectTextDisplayed(TEST_DAPP_LOAD_LABEL, {
      timeout: 30_000,
      description: 'Test dapp heading should be visible',
    });
    return;
  }

  if (PlatformDetector.isIOSAppium()) {
    await Assertions.expectElementToBeVisible(
      Matchers.getElementByText(getDappUrl(0)),
      { description: 'Browser URL bar should show test dapp URL' },
    );
    return;
  }

  throw new Error('Test dapp load is only supported on Appium Android/iOS');
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

      throw new Error(
        'Test Snaps load is only supported on Appium Android/iOS',
      );
    } catch (error) {
      if (attempt < MAX_RETRIES) {
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
const getFirstBrowserTabInGrid = () => {
  if (PlatformDetector.isAndroid()) {
    // TabThumbnail sets accessibilityLabel to "Switch tab"; Android exposes it as content-desc.
    return Matchers.getElementByAndroidUIAutomator(
      '.descriptionContains("Switch tab")',
      { index: 0 },
    );
  }

  return Matchers.getElementByID(BrowserViewSelectorsIDs.TABS_ITEM_REGEX, 0);
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

const getBrowserUrlBarVisibleIndicator = () =>
  // TextInput (`browser-modal-url-input`) is hidden when the URL bar is unfocused;
  // the wrapper view (`url-input`) stays visible and shows the current URL.
  Matchers.getElementByID(BrowserViewSelectorsIDs.URL_INPUT);

export const navigateToBrowserView = async (): Promise<void> => {
  await TabBarComponent.tapExploreButton();
  await TrendingView.tapBrowserButton();

  // If we landed on the "Opened tabs" grid (tab list), select the first tab to get to single-tab view
  await ensureSingleBrowserTabView();

  await Assertions.expectElementToBeVisible(
    getBrowserUrlBarVisibleIndicator(),
    {
      description: 'Browser URL bar should be visible after navigation',
      timeout: 30_000,
    },
  );
};

export const openUrlInBrowserView = async (): Promise<void> => {
  await Gestures.waitAndTap(
    Matchers.getElementByID(BrowserViewSelectorsIDs.URL_INPUT),
    {
      elemDescription: 'URL input box',
    },
  );
};

/**
 * Opens the in-app test dapp and completes the default connect sheet approval.
 * Assumes the browser tab is already open (e.g. after {@link navigateToBrowserView}).
 */
export const connectToTestDapp = async (): Promise<void> => {
  await BrowserView.navigateToTestDApp();
  await waitForTestDappToLoad();
  await TestDApp.tapDappConnectButton();
  await ConnectBottomSheet.tapConnectButton();
};
