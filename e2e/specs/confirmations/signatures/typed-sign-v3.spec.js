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
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../../fixtures/utils';

describe(SmokeConfirmations('Typed Sign V3'), () => {
  const testSpecificMock = {
    GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
    await TestHelpers.reverseServerPort();
  });

  it('should sign typed V3 message', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(buildPermissions(['0x539']))
          .build(),
        restartDevice: true,
        ganacheOptions: defaultGanacheOptions,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapTypedV3SignButton();
        await Assertions.checkIfVisible(SigningBottomSheet.typedRequest);
        await SigningBottomSheet.tapCancelButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);
        await TestDApp.tapTypedV3SignButton();

        await SigningBottomSheet.tapSignButton();
        await Assertions.checkIfNotVisible(SigningBottomSheet.typedRequest);
        await Assertions.checkIfNotVisible(SigningBottomSheet.personalRequest);
      },
    );
  });
});
