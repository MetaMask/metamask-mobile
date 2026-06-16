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

/**
 * Sync-disabled variant of {@link navigateToBrowserView} for Speculos/Ledger
 * tests, where Detox synchronization is disabled because the BLE bridge keeps
 * the JS thread busy. Under sync-disabled the first Explore tap is often
 * absorbed (tab doesn't switch) and the standard 75%-visibility assertions are
 * flaky, so this retries the Explore tap and uses `toExist` (no coverage).
 *
 * Callers must ensure the wallet home is the active screen first (e.g.
 * `importLedgerAccount` returns to the wallet home via the identicon toggle).
 */
export const navigateToBrowserViewSyncDisabled = async (): Promise<void> => {
  const sleep = (ms: number): Promise<void> =>
    new Promise((r) => setTimeout(r, ms));
  const exists = async (
    getter: () => Promise<unknown> | unknown,
  ): Promise<boolean> => {
    try {
      const el = (await getter()) as Detox.IndexableNativeElement;
      await waitFor(el).toExist().withTimeout(2500);
      return true;
    } catch {
      return false;
    }
  };
  await sleep(2000);

  // 1. Retry tapping Explore until the Trending browser button exists.
  let onTrending = false;
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const exploreTab =
        (await TabBarComponent.tabBarExploreButton) as Detox.IndexableNativeElement;
      await exploreTab.tap();
    } catch {
      // ignore — retry
    }
    await sleep(2500);
    if (await exists(() => TrendingView.browserButton)) {
      onTrending = true;
      break;
    }
  }
  if (!onTrending) {
    throw new Error(
      'navigateToBrowserViewSyncDisabled: Trending browser button never appeared',
    );
  }

  // 2. Tap the Browser button on the Trending screen.
  const browserBtn =
    (await TrendingView.browserButton) as Detox.IndexableNativeElement;
  await sleep(1000);
  await browserBtn.tap();
  await sleep(3000); // let the browser view render

  // 3. If the "Opened tabs" grid is shown, select the first tab.
  await ensureSingleBrowserTabView();

  // 4. Wait for the URL bar to exist.
  const urlBar =
    (await BrowserView.urlInputBoxID) as Detox.IndexableNativeElement;
  await waitFor(urlBar).toExist().withTimeout(60000);
  await sleep(1000);
};
