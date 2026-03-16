import Assertions from '../framework/Assertions';
import Gestures from '../framework/Gestures';
import Matchers from '../framework/Matchers';
import Utilities from '../framework/Utilities';
import BrowserView from '../page-objects/Browser/BrowserView';
import TestDApp from '../page-objects/Browser/TestDApp';
import { BrowserViewSelectorsIDs } from '../../app/components/Views/BrowserTab/BrowserView.testIds';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import TrendingView from '../page-objects/Trending/TrendingView';

/**
 * Waits for the test dapp to load.
 * @async
 * @function waitForTestDappToLoad
 * @returns {Promise<void>} A promise that resolves when the test dapp is loaded.
 * @throws {Error} Throws an error if the test dapp fails to load after a certain number of attempts.
 */
export const waitForTestDappToLoad = async (): Promise<void> => {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await Assertions.expectElementToBeVisible(TestDApp.testDappFoxLogo, {
        description: 'Test Dapp Fox Logo should be visible',
      });
      await Assertions.expectElementToBeVisible(TestDApp.testDappPageTitle, {
        description: 'Test Dapp Page Title should be visible',
      });
      await Assertions.expectElementToBeVisible(TestDApp.DappConnectButton, {
        description: 'Test Dapp Connect Button should be visible',
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

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await Assertions.expectElementToBeVisible(
        Matchers.getElementByWebID(
          BrowserViewSelectorsIDs.BROWSER_WEBVIEW_ID,
          'root',
        ),
      );
    } catch (error) {
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
const ensureSingleBrowserTabView = async (): Promise<void> => {
  const openedTabsHeader = Matchers.getElementByID(
    BrowserViewSelectorsIDs.TABS_OPENED_TITLE,
  );
  const isInTabListView = await Utilities.isElementVisible(
    openedTabsHeader,
    2000,
  );
  if (isInTabListView) {
    const firstTab = Matchers.getElementByID(
      BrowserViewSelectorsIDs.TABS_ITEM_REGEX,
      0,
    );
    await Gestures.waitAndTap(firstTab, {
      elemDescription: 'First browser tab (select to open single-tab view)',
    });
  }
};

export const navigateToBrowserView = async (): Promise<void> => {
  await TabBarComponent.tapExploreButton();
  await TrendingView.tapBrowserButton();

  // If we landed on the "Opened tabs" grid (tab list), select the first tab to get to single-tab view
  await ensureSingleBrowserTabView();

  await Assertions.expectElementToBeVisible(BrowserView.urlInputBoxID, {
    description: 'Browser URL bar should be visible after navigation',
  });
};
