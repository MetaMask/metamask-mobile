'use strict';
import Browser from '../../../pages/Browser';
import TabBarComponent from '../../../pages/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningModal from '../../../pages/modals/SigningModal';
import { TestDApp } from '../../../pages/TestDApp';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { SmokeConfirmations } from '../../../tags';
import TestHelpers from '../../../helpers';
import Assertions from '../../../utils/Assertions';

const MAX_ATTEMPTS = 3;

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

        await TestHelpers.retry(MAX_ATTEMPTS, async () => {
          await TestDApp.tapEthSignButton();
          await Assertions.checkIfVisible(SigningModal.ethRequest);
          await SigningModal.tapCancelButton();

          await Assertions.checkIfNotVisible(SigningModal.ethRequest);
          await Assertions.checkIfNotVisible(SigningModal.personalRequest);
          await Assertions.checkIfNotVisible(SigningModal.typedRequest);

          await TestDApp.tapEthSignButton();
          await Assertions.checkIfVisible(SigningModal.ethRequest);
          await SigningModal.tapSignButton();
          await Assertions.checkIfNotVisible(SigningModal.typedRequest);
          await Assertions.checkIfNotVisible(SigningModal.ethRequest);
          await Assertions.checkIfNotVisible(SigningModal.personalRequest);
        });
      },
    );
  });
});
