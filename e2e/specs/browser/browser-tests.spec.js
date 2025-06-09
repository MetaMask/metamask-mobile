'use strict';
import TestHelpers from '../../helpers';
import { SmokeWalletPlatform } from '../../tags';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import { getFixturesServerPort } from '../../fixtures/utils';
import FixtureServer from '../../fixtures/fixture-server';
import Assertions from '../../utils/Assertions';
import ExternalSites from '../../resources/externalsites.json';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';

const fixtureServer = new FixtureServer();

describe(SmokeWalletPlatform('Browser Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  it('should navigate to browser', async () => {
    await TabBarComponent.tapBrowser();
    // Check that we are on the browser screen

    await Assertions.checkIfVisible(Browser.browserScreenID);
  });

  it('should connect to the test dapp', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(ExternalSites.TEST_DAPP);
    await Browser.waitForBrowserPageToLoad();
  });

  // it('should add the test dapp to favorites', async () => {
  //   // Check that we are still on the browser screen

  //   // Tap on options
  //   await Browser.tapOptionsButton();
  //   await Browser.tapAddToFavoritesButton();

  //   await Assertions.checkIfVisible(AddBookmarkView.container);

  //   await AddBookmarkView.tapAddBookmarksButton();
  //   await Assertions.checkIfNotVisible(AddBookmarkView.container);
  // });

  // it('should tap on the test dapp in favorites on the home page', async () => {
  //   await Browser.tapHomeButton();
  //   // Wait for page to load
  //   await TestHelpers.delay(3000);
  //   await Browser.tapDappInFavorites();
  //   await Assertions.checkIfTextIsDisplayed('metamask.github.io');
  //   // }
  // });

  it('should test invalid URL', async () => {
    await TestHelpers.delay(2000);
    await Browser.tapBottomSearchBar();
    // Clear text & Navigate to URL
    await Browser.navigateToURL(ExternalSites.INVALID_URL);
    await Browser.waitForBrowserPageToLoad();
    await Browser.tapReturnHomeButton();
    // Check that we are on the browser screen
    await TestHelpers.delay(1500);
  });

  // This is failing on android, because of the OS-level enforced
  // ERR_CLEARTEXT_NOT_PERMITTED error
  // We temporarily disable this test for android until we work out a solution
  // https://consensyssoftware.atlassian.net/browse/IDENTITY-75

  const itif = (condition) => (condition ? it : it.skip);
  itif(device.getPlatform() === 'ios')(
    'should test phishing sites',
    async () => {
      await Browser.tapBottomSearchBar();
      // Clear text & Navigate to URL
      await Browser.navigateToURL(ExternalSites.PHISHING_SITE);
      await Browser.waitForBrowserPageToLoad();
      await Assertions.checkIfVisible(Browser.backToSafetyButton);

      await Browser.tapBackToSafetyButton();
      // Check that we are on the browser screen
      await TestHelpers.delay(1500);
    },
  );
});
