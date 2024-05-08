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

describe(SmokeConfirmations('Eth Sign'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should sign eth_sign message', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPreferencesController({
            disabledRpcMethodPreferences: {
              eth_sign: true,
            },
          })
          .withPermissionControllerConnectedToTestDapp()
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapEthSignButton();

        await SigningModal.isEthRequestVisible();
        await SigningModal.tapCancelButton();
        await SigningModal.isNotVisible();

        await TestDApp.tapEthSignButton();

        await SigningModal.isEthRequestVisible();
        await SigningModal.tapSignButton();
        await SigningModal.isNotVisible();
      },
    );
  });
});
