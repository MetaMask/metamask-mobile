'use strict';
import Assertions from '../../../utils/Assertions.js';
import Browser from '../../../pages/Browser/BrowserView.js';
import FixtureBuilder from '../../../fixtures/fixture-builder.js';
import PageSections from '../../../pages/Browser/Confirmations/PageSections.js';
import TabBarComponent from '../../../pages/wallet/TabBarComponent.js';
import TestDApp from '../../../pages/Browser/TestDApp.js';
import TestHelpers from '../../../helpers.js';
import { loginToApp } from '../../../viewHelper.js';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper.js';
import { SmokeConfirmationsRedesigned } from '../../../tags.js';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events.js';

describe(SmokeConfirmationsRedesigned('Confirmations Page Scroll'), () => {
  const testSpecificMock = {
    GET: [mockEvents.GET.remoteFeatureFlagsReDesignedConfirmations],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should not display scroll button if the page has no scroll', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPersonalSignButton.bind(TestDApp);
        await Assertions.checkIfNotVisible(PageSections.ScrollButton);
      },
    );
  });

  it('should display scroll button if the page has scroll', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPermitSignButton.bind(TestDApp);
        await Assertions.checkIfVisible(PageSections.ScrollButton);
      },
    );
  });
});
