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
import TestHelpers from '../../../helpers';
import Assertions from '../../../utils/Assertions';

describe(SmokeConfirmations('Personal Sign'), () => {
  const mockRemoteFeatureApi = {
    GET: [
      {
        urlEndpoint:
          'https://client-config.api.cx.metamask.io/v1/flags?client=mobile&distribution=main&environment=dev',
        response: [{ confirmation_redesign: { signatures: 'false' } }],
        responseCode: 200,
      },
    ],
  };
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
        testSpecificMock: mockRemoteFeatureApi,
        ganacheOptions: defaultGanacheOptions,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapPersonalSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.personalRequest);
        await SigningBottomSheet.tapCancelButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);

        await TestDApp.tapPersonalSignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.personalRequest);
        await SigningBottomSheet.tapSignButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);
      },
    );
  });
});
