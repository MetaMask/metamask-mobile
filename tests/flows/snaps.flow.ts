import { Assertions } from '../framework';
import AccountMenu from '../page-objects/AccountMenu/AccountMenu';
import BrowserView from '../page-objects/Browser/BrowserView';
import TestSnaps from '../page-objects/Browser/TestSnaps';
import SettingsView from '../page-objects/Settings/SettingsView';
import SnapSettingsView from '../page-objects/Settings/SnapSettingsView';
import TrendingView from '../page-objects/Trending/TrendingView';
import TabBarComponent from '../page-objects/wallet/TabBarComponent';
import WalletView from '../page-objects/wallet/WalletView';
import { navigateToBrowserView, waitForTestSnapsToLoad } from './browser.flow';
import { loginToAppPlaywright } from './wallet.flow';
import { TEST_SNAPS_URL } from '../selectors/Browser/TestSnaps.selectors';

/**
 * Logs in with the e2e wallet fixture and navigates to the test-snaps page.
 * Use after `withSnapsFixtures` in Appium snap smoke specs.
 */
export const loginAndOpenTestSnaps = async (): Promise<void> => {
  await loginToAppPlaywright({ scenarioType: 'e2e' });
  await navigateToBrowserView();
  await TestSnaps.navigateToTestSnap({ skipTabCleanup: true });
};

/**
 * Navigate from the browser to Snap Settings.
 * After closing the browser the tab bar may not be immediately available,
 * so we navigate step-by-step with explicit waits.
 */
export const navigateFromBrowserToSnapSettings = async (): Promise<void> => {
  await BrowserView.tapCloseBrowserButton();
  await TabBarComponent.tapWallet();
  await WalletView.tapHamburgerMenu();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10_000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapSettings();
  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10_000,
    description: 'Settings view title should be visible',
  });
  await SettingsView.tapSnaps();
};

/**
 * Navigate from Snap Settings back to the in-app browser (test-snaps page).
 * Walks back through Snap Settings → Settings → Account menu → Explore →
 * Browser, then selects the test-snaps tab by host a11y label.
 */
export const navigateFromSnapSettingsToBrowser = async (): Promise<void> => {
  await SnapSettingsView.tapBackButton();
  await SnapSettingsView.tapListBackButton();

  await Assertions.expectElementToBeVisible(SettingsView.title, {
    timeout: 10_000,
    description: 'Settings view should be visible',
  });
  await SettingsView.tapBackButton();
  await Assertions.expectElementToBeVisible(AccountMenu.container, {
    timeout: 10_000,
    description: 'Account menu should be visible',
  });
  await AccountMenu.tapBack();

  await TabBarComponent.tapExploreButton();
  await TrendingView.tapBrowserButton();
  await BrowserView.selectTabByPartialUrl(new URL(TEST_SNAPS_URL).origin);
  await waitForTestSnapsToLoad();
};
