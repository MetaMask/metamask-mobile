'use strict';
import TestHelpers from '../helpers';
import { Smoke } from '../tags';
import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';
import TabBarComponent from '../pages/TabBarComponent';

import { CreateNewWallet } from '../viewHelper';

const PHISHING_SITE = 'http://www.empowr.com/FanFeed/Home.aspx';
const INVALID_URL = 'https://quackquakc.easq';
const TEST_DAPP = 'https://metamask.github.io/test-dapp/';
const METAMASK_TEST_DAPP_SHORTEN_URL_TEXT = 'metamask.github.io';
describe(Smoke('Browser Tests'), () => {
  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should create new wallet', async () => {
    await CreateNewWallet();
  });

  it('should navigate to browser', async () => {
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen
    await Browser.isVisible();
  });

  it('should connect to the test dapp', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(TEST_DAPP);
    await Browser.waitForBrowserPageToLoad();
  });

  it('should add the test dapp to favorites', async () => {
    // Check that we are still on the browser screen
    await Browser.isVisible();
    // Tap on options
    await Browser.tapOptionsButton();
    await Browser.tapAddToFavoritesButton();
    await Browser.isAddBookmarkScreenVisible();
    await Browser.tapAddBookmarksButton();

    await Browser.isAddBookmarkScreenNotVisible(); // Add bookmark screen should not be visible
  });

  it('tap on home button', async () => {
    // Tap on home on bottom navbar
    await Browser.tapHomeButton();
    // Wait for page to load
    await TestHelpers.delay(1000);
    await Browser.isVisible();
  });

  it('should tap on the test dapp in favorites', async () => {
    if (device.getPlatform() === 'ios') {
      // Tapping on favourite iOS
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 174, y: 281 });
      await Browser.waitForBrowserPageToLoad();
    } else {
      // Tapping on favorite tap on Android
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 274, y: 223 });
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 180, y: 275 });
      await Browser.waitForBrowserPageToLoad();
    }
    await TestHelpers.checkIfElementWithTextIsVisible(
      METAMASK_TEST_DAPP_SHORTEN_URL_TEXT,
      0,
    );

    await Browser.isVisible();
  });

  it('should test invalid URL', async () => {
    await TestHelpers.delay(2000);

    await Browser.tapBottomSearchBar();
    // Clear text & Navigate to URL
    await Browser.navigateToURL(INVALID_URL);
    await Browser.waitForBrowserPageToLoad();

    await Browser.tapReturnHomeButton();
    // Check that we are on the browser screen
    if (!device.getPlatform() === 'android') {
      await TestHelpers.delay(1500);
    }
    await Browser.isVisible();
  });

  it('should test phishing sites', async () => {
    await Browser.tapBottomSearchBar();
    // Clear text & Navigate to URL
    await Browser.navigateToURL(PHISHING_SITE);
    await Browser.waitForBrowserPageToLoad();

    await Browser.isBackToSafetyButtonVisible();
    await Browser.tapBackToSafetyButton();

    // Check that we are on the browser screen
    if (!device.getPlatform() === 'android') {
      await TestHelpers.delay(1500);
    }
    await Browser.isVisible();
  });
});
