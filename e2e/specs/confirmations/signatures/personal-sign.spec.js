'use strict';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningModal from '../../../pages/modals/SigningModal';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { SmokeConfirmations } from '../../../tags';
import TestHelpers from '../../../helpers';

describe(SmokeConfirmations('Personal Sign'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should sign personal message', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPersonalSignButton();
        await SigningModal.isPersonalRequestVisible();
        await SigningModal.tapCancelButton();
        await SigningModal.isNotVisible();

        await TestDApp.tapPersonalSignButton();
        await SigningModal.isPersonalRequestVisible();
        await SigningModal.tapSignButton();
        await SigningModal.isNotVisible();
      },
    );
  });
});
