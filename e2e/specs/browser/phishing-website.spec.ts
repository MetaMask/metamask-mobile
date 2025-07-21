'use strict';
import Browser from '../../pages/Browser/BrowserView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import { withFixtures } from '../../fixtures/fixture-helper';
import { SmokeWalletPlatform } from '../../tags';
import TestHelpers from '../../helpers';
import PhishingModal from '../../pages/Browser/PhishingModal.ts';

describe(SmokeWalletPlatform('Try to open a phishing website'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('Open phishing website and get back from the modal', async () => {
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
        await Browser.navigateToURL('https://coin-qr.to');
        await PhishingModal.verifyModalIsVisible();
        await PhishingModal.tapBackToSafetyButton();
        await Browser.checkCurrentUrlInInputBox('portfolio.metamask.io');
        await PhishingModal.verifyModalIsHidden();
      },
    );
  });

  it('Open website which loads phishing website via iFrame and get back from the modal', async () => {
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
        await Browser.navigateToURL('https://lol-au4.pages.dev/cb');
        await PhishingModal.verifyModalIsVisible();
        await PhishingModal.tapBackToSafetyButton();
        await Browser.checkCurrentUrlInInputBox('portfolio.metamask.io');
        await PhishingModal.verifyModalIsHidden();
      },
    );
  });
});
