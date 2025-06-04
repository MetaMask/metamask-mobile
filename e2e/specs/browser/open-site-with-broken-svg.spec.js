'use strict';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import {loginToApp} from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {withFixtures} from '../../fixtures/fixture-helper';
import {SmokeWalletPlatform} from '../../tags';
import TestHelpers from '../../helpers';
import Assertions from '../../utils/Assertions';

describe(SmokeWalletPlatform('Search for a website with broken SVG and open it'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('Open app.ens.domains', async () => {
    await withFixtures(
      {
        dapp: false,
        fixture: new FixtureBuilder().build(),
        restartDevice: true,
        testSpecificMock: false,
      },
      async () => {
        await loginToApp();
        await TabBarComponent.tapBrowser();
        await Browser.navigateToURL('https://app.ens.domains');
        await Browser.searchForUrl('app.ens.domains');
        await TestHelpers.delay(5000); // Wait for SVG images to load and not crash
        await Assertions.checkIfElementWithTextDoesNotExist('E'); // Validate that SVG is loaded and text placeholder logo is not displayed
      },
    );
  });
});
