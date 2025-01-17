'use strict';
import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../fixtures/fixture-builder';
import {
  withFixtures,
  defaultGanacheOptions,
} from '../../../fixtures/fixture-helper';
import { SmokeConfirmations } from '../../../tags';
import Assertions from '../../../utils/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import Utilities from '../../../utils/Utilities';

describe(SmokeConfirmations('Ethereum Sign'), () => {
  beforeAll(async () => {
    jest.setTimeout(2500000);
    await Utilities.reverseServerPort();
  });

  it('Sign in with Ethereum', async () => {
    const testSpecificMock = {
      GET: [mockEvents.GET.remoteFeatureFlags],
    };

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

        await TestDApp.tapEthereumSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.personalRequest);
        await SigningBottomSheet.tapCancelButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);

        await TestDApp.tapEthereumSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.personalRequest);
        await SigningBottomSheet.tapSignButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);
      },
    );
  });
});
