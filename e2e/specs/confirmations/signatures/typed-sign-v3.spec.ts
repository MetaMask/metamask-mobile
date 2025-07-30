import Browser from '../../../pages/Browser/BrowserView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../../viewHelper';
import SigningBottomSheet from '../../../pages/Browser/SigningBottomSheet';
import TestDApp from '../../../pages/Browser/TestDApp';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import { SmokeConfirmations } from '../../../tags';
import Assertions from '../../../framework/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { buildPermissions } from '../../../fixtures/utils';
import { DappVariants } from '../../../framework/Constants';

describe(SmokeConfirmations('Typed Sign V3'), () => {
  const testSpecificMock = {
    GET: [mockEvents.GET.remoteFeatureFlagsOldConfirmations],
  };

  beforeAll(async () => {
    jest.setTimeout(2500000);
  });

  it('should sign typed V3 message', async () => {
    await withFixtures(
      {
        dapps: [
          {
            dappVariant: DappVariants.TEST_DAPP,
          },
        ],
        fixture: new FixtureBuilder()
          .withGanacheNetwork()
          .withPermissionControllerConnectedToTestDapp(
            buildPermissions(['0x539']),
          )
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();

        await TabBarComponent.tapBrowser();
        await Browser.navigateToTestDApp();

        await TestDApp.tapTypedV3SignButton();
        await Assertions.expectElementToBeVisible(
          SigningBottomSheet.typedRequest,
        );
        await SigningBottomSheet.tapCancelButton();
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.typedRequest,
        );
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.personalRequest,
        );
        await TestDApp.tapTypedV3SignButton();

        await SigningBottomSheet.tapSignButton();
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.typedRequest,
        );
        await Assertions.expectElementToNotBeVisible(
          SigningBottomSheet.personalRequest,
        );
      },
    );
  });
});
