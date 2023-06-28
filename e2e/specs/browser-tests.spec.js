'use strict';
import TestHelpers from '../helpers';
import { Smoke } from '../tags';
import Browser from '../pages/Drawer/Browser';
import { BROWSER_SCREEN_ID } from '../../wdio/screen-objects/testIDs/BrowserScreen/BrowserScreen.testIds';
import TabBarComponent from '../pages/TabBarComponent';
import ConnectModal from '../pages/modals/ConnectModal';

import { CreateNewWallet } from '../viewHelper';

const ENS_Example = 'https://brunobarbieri.eth';
const ENS_TLD = 'https://inbox.mailchain.xyz';
const SUSHI_SWAP = 'https://app.sushi.com/swap';
const PHISHING_SITE = 'http://www.empowr.com/FanFeed/Home.aspx';
const INVALID_URL = 'https://quackquakc.easq';

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
    await TestHelpers.delay(3000);
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
      await TestHelpers.delay(1500);
    } else {
      // Tapping on favorite tap on Android
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 274, y: 223 });
      await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 180, y: 275 });
      await TestHelpers.delay(3500);
    }
    // Wait for connect prompt to display
    await TestHelpers.delay(5000);
    await ConnectModal.tapConnectButton();

    await TestHelpers.tapAtPoint(BROWSER_SCREEN_ID, { x: 20, y: 130 }); // tapping to dismiss keyboard

    await Browser.isVisible();
  });

  it('should test ENS sites', async () => {
    // Tap on home on bottom navbar
    await Browser.tapHomeButton();
    await TestHelpers.delay(1000);

    await Browser.tapBottomSearchBar();

    // Navigate to ENS URL
    await Browser.navigateToURL(ENS_Example);
    await Browser.isVisible();

    await Browser.tapBottomSearchBar();
    // Navigate to URL
    await Browser.navigateToURL(ENS_TLD);
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
