'use strict';
import TestHelpers from '../../helpers';
import { SmokeCore } from '../../tags';
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
import TabBarComponent from '../../pages/TabBarComponent';
import AddBookmarkView from '../../pages/Browser/AddBookmarkView';

const fixtureServer = new FixtureServer();

describe(SmokeCore('Browser Tests'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await device.launchApp({
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

    await Assertions.checkIfVisible(await Browser.browserScreenID);
  });

  it('should connect to the test dapp', async () => {
    await TestHelpers.delay(3000);
    // Tap on search in bottom navbar
    await Browser.tapUrlInputBox();
    await Browser.navigateToURL(ExternalSites.TEST_DAPP);
    await Browser.waitForBrowserPageToLoad();
  });

  it('should add the test dapp to favorites', async () => {
    // Check that we are still on the browser screen
    // Tap on options
  });
});
